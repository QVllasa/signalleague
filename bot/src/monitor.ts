/**
 * Twitter monitoring pipeline for the SignalLeague bot.
 * Watches Crypto Twitter for PnL posts, group promotions, scam reports,
 * and drama. Classifies tweets, stores mentions, discovers new groups,
 * and queues bot responses for high-engagement content.
 */

import { getTwitterClient } from "./twitter.js";
import {
  checkTweetProcessed,
  insertTwitterMention,
  insertBotQueueItem,
  insertDiscoveredGroup,
  getApprovedGroups,
  getBotConfig,
} from "./db.js";
import type { SignalGroup, BotConfigRow } from "./db.js";
import { config } from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TweetType =
  | "pnl_post"
  | "group_promo"
  | "drama"
  | "scam_report"
  | "general"
  | "irrelevant";

type Sentiment = "positive" | "negative" | "neutral";

interface ClassificationResult {
  type: TweetType;
  confidence: number;
  extractedLinks: ExtractedLink[];
}

interface ExtractedLink {
  platform: "telegram" | "discord" | "whop" | "unknown";
  url: string;
  handle: string;
}

interface TweetData {
  id: string;
  text: string;
  author_id?: string;
  author_username?: string;
  author_followers?: number;
  author_description?: string;
  created_at?: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count?: number;
  };
  has_media?: boolean;
  media_types?: string[];
  referenced_tweets?: Array<{ type: string; id: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_KEYWORDS =
  "PnL,signal group,join my VIP,free signals,copy my trades,win rate,profit screenshot";

/** Engagement threshold to queue a bot response. */
const ENGAGEMENT_THRESHOLD = 100;

/** Follower threshold to queue a bot response. */
const FOLLOWER_THRESHOLD = 5_000;

// ---------------------------------------------------------------------------
// Classification keyword sets
// ---------------------------------------------------------------------------

const PNL_KEYWORDS = [
  "pnl",
  "p&l",
  "profit",
  "roi",
  "+%",
  "unrealized",
  "realized gain",
  "total return",
  "account balance",
  "portfolio up",
];

const GROUP_PROMO_KEYWORDS = [
  "join",
  "vip",
  "signal group",
  "free signals",
  "premium signals",
  "paid group",
  "inner circle",
  "exclusive group",
  "sign up",
  "membership",
  "subscribe",
];

const GROUP_PROMO_BIO_PATTERNS = [
  /t\.me\//i,
  /discord\.gg\//i,
  /whop\.com\//i,
  /linktr\.ee\//i,
];

const SCAM_KEYWORDS = [
  "scam",
  "scammer",
  "rug",
  "rugged",
  "rug pull",
  "fake",
  "fraud",
  "ponzi",
  "exit scam",
  "lost my money",
  "stolen",
  "beware",
  "warning",
  "do not trust",
  "fake pnl",
  "photoshopped",
];

const DRAMA_KEYWORDS = [
  "exposed",
  "called out",
  "beef",
  "drama",
  "receipts",
  "ratio",
  "caught",
  "lying",
  "lied",
  "clown",
  "fraud exposed",
  "unfollow",
  "blocked",
  "feud",
];

const POSITIVE_KEYWORDS = [
  "great",
  "amazing",
  "profit",
  "moon",
  "bullish",
  "win",
  "winner",
  "gains",
  "lfg",
  "lets go",
  "nailed it",
  "fire",
  "goat",
  "legend",
  "insane",
  "bank",
  "cash",
  "hit",
  "accurate",
  "on point",
  "best",
  "love",
];

const NEGATIVE_KEYWORDS = [
  "scam",
  "loss",
  "fake",
  "rug",
  "rugged",
  "rekt",
  "wrecked",
  "bad",
  "terrible",
  "worst",
  "avoid",
  "trash",
  "garbage",
  "lost",
  "down",
  "bearish",
  "failed",
  "fraud",
  "liar",
  "disappointing",
];

const CRYPTO_KEYWORDS = [
  "btc",
  "eth",
  "bitcoin",
  "ethereum",
  "crypto",
  "defi",
  "nft",
  "altcoin",
  "token",
  "blockchain",
  "web3",
  "trading",
  "chart",
  "ta",
  "technical analysis",
  "entry",
  "exit",
  "long",
  "short",
  "leverage",
  "futures",
  "spot",
  "binance",
  "bybit",
  "dex",
  "swap",
  "yield",
  "airdrop",
  "whale",
  "pump",
  "dump",
  "degen",
  "hodl",
  "usdt",
  "usdc",
  "solana",
  "sol",
];

// ---------------------------------------------------------------------------
// Link extraction regex
// ---------------------------------------------------------------------------

const LINK_PATTERNS: Array<{
  platform: ExtractedLink["platform"];
  regex: RegExp;
}> = [
  {
    platform: "telegram",
    regex: /(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+(?:\/[a-zA-Z0-9_]+)?)/gi,
  },
  {
    platform: "discord",
    regex: /(?:https?:\/\/)?discord\.gg\/([a-zA-Z0-9_-]+)/gi,
  },
  {
    platform: "whop",
    regex: /(?:https?:\/\/)?whop\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?)/gi,
  },
];

// ---------------------------------------------------------------------------
// Interval management
// ---------------------------------------------------------------------------

let intervalId: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start the monitoring pipeline.
 * Runs an initial cycle immediately, then repeats every 2 minutes.
 */
export function startMonitor(): void {
  // Run immediately on start
  void monitorCycle();

  // Then on interval
  intervalId = setInterval(() => {
    void monitorCycle();
  }, config.monitorIntervalMs);
}

/**
 * Stop the monitoring pipeline.
 */
export function stopMonitor(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// ---------------------------------------------------------------------------
// Main monitoring cycle
// ---------------------------------------------------------------------------

async function monitorCycle(): Promise<void> {
  try {
    console.log("[Monitor] Starting monitoring cycle...");

    const client = getTwitterClient();

    // ------------------------------------------------------------------
    // 1. Load configuration from bot_config table
    // ------------------------------------------------------------------
    const botConfigRows = await getBotConfig();
    const configMap = new Map<string, string>();
    for (const row of botConfigRows) {
      configMap.set(row.key, row.value);
    }

    const keywordsRaw = configMap.get("monitor_keywords") ?? DEFAULT_KEYWORDS;
    const keywords = keywordsRaw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const blockedAccountsRaw = configMap.get("blocked_accounts") ?? "";
    const blockedAccounts = new Set(
      blockedAccountsRaw
        .split(",")
        .map((a) => a.trim().toLowerCase().replace(/^@/, ""))
        .filter(Boolean),
    );

    // ------------------------------------------------------------------
    // 2. Load approved groups for matching
    // ------------------------------------------------------------------
    const approvedGroups = await getApprovedGroups();

    // ------------------------------------------------------------------
    // 3. Build the time window (last 15 minutes)
    // ------------------------------------------------------------------
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // ------------------------------------------------------------------
    // 4. Search for each keyword
    // ------------------------------------------------------------------
    let totalProcessed = 0;
    let newMentions = 0;
    let groupsDiscovered = 0;

    for (const keyword of keywords) {
      try {
        // Build a query that restricts to recent crypto-ish tweets, no retweets
        const query = `"${keyword}" -is:retweet lang:en`;

        const { tweets, includes } = await client.searchRecent(query, 20);

        for (const tweet of tweets) {
          totalProcessed++;

          // Resolve author info from includes
          const authorUser = includes?.users?.find(
            (u) => u.id === tweet.author_id,
          );
          const authorUsername = authorUser?.username ?? "unknown";
          const authorFollowers =
            authorUser?.public_metrics?.followers_count ?? 0;
          const authorDescription = authorUser?.description ?? "";

          // Skip blocked accounts
          if (blockedAccounts.has(authorUsername.toLowerCase())) {
            continue;
          }

          // Skip already-processed tweets
          const alreadyProcessed = await checkTweetProcessed(tweet.id);
          if (alreadyProcessed) {
            continue;
          }

          // Check if tweet was within our time window
          if (tweet.created_at) {
            const tweetDate = new Date(tweet.created_at);
            if (tweetDate < fifteenMinutesAgo) {
              continue;
            }
          }

          // Determine if tweet has media (images)
          const hasMedia =
            !!tweet.attachments?.media_keys &&
            tweet.attachments.media_keys.length > 0;
          const mediaTypes =
            includes?.media
              ?.filter((m) =>
                tweet.attachments?.media_keys?.includes(m.media_key),
              )
              .map((m) => m.type) ?? [];

          // Build enriched tweet data for classification
          const tweetData: TweetData = {
            id: tweet.id,
            text: tweet.text,
            author_id: tweet.author_id,
            author_username: authorUsername,
            author_followers: authorFollowers,
            author_description: authorDescription,
            created_at: tweet.created_at,
            public_metrics: tweet.public_metrics,
            has_media: hasMedia,
            media_types: mediaTypes,
            referenced_tweets: tweet.referenced_tweets as
              | TweetData["referenced_tweets"]
              | undefined,
          };

          // ----------------------------------------------------------
          // Classify the tweet
          // ----------------------------------------------------------
          const classification = classifyTweet(tweetData);

          if (classification.type === "irrelevant") {
            continue;
          }

          // ----------------------------------------------------------
          // Determine sentiment
          // ----------------------------------------------------------
          const sentiment = determineSentiment(tweet.text);

          // ----------------------------------------------------------
          // Calculate total engagement
          // ----------------------------------------------------------
          const engagement = calculateEngagement(tweet.public_metrics);

          // ----------------------------------------------------------
          // Store in twitter_mentions table
          // ----------------------------------------------------------
          await insertTwitterMention({
            tweet_id: tweet.id,
            author_id: tweet.author_id ?? "",
            author_username: authorUsername,
            text: tweet.text,
            intent: classification.type,
            entities: {
              classification: classification.type,
              confidence: classification.confidence,
              sentiment,
              engagement,
              author_followers: authorFollowers,
              extracted_links: classification.extractedLinks,
              has_media: hasMedia,
            },
            created_at: tweet.created_at ? new Date(tweet.created_at) : undefined,
          });

          newMentions++;

          // ----------------------------------------------------------
          // Handle group_promo: discover new groups
          // ----------------------------------------------------------
          if (classification.type === "group_promo") {
            // Also extract links from author bio
            const bioLinks = extractGroupLinks(authorDescription);
            const allLinks = [...classification.extractedLinks, ...bioLinks];

            // Deduplicate by URL
            const uniqueLinks = deduplicateLinks(allLinks);

            for (const link of uniqueLinks) {
              // Try to match to an existing approved group
              const matchedGroup = matchLinkToGroup(link, approvedGroups);

              if (!matchedGroup) {
                // Insert as discovered group with status pending
                const groupName = deriveGroupName(link, authorUsername);
                const slug = slugify(groupName);

                await insertDiscoveredGroup({
                  name: groupName,
                  slug,
                  description: `Discovered from @${authorUsername}'s tweet. Platform: ${link.platform}`,
                  source_url: link.url,
                });

                groupsDiscovered++;
              }
            }
          }

          // ----------------------------------------------------------
          // Queue bot response for high-engagement / high-follower tweets
          // ----------------------------------------------------------
          if (
            engagement > ENGAGEMENT_THRESHOLD ||
            authorFollowers > FOLLOWER_THRESHOLD
          ) {
            await insertBotQueueItem({
              action_type: mapTypeToAction(classification.type),
              payload: {
                tweet_id: tweet.id,
                author_username: authorUsername,
                author_followers: authorFollowers,
                text: tweet.text,
                classification: classification.type,
                confidence: classification.confidence,
                sentiment,
                engagement,
                extracted_links: classification.extractedLinks,
              },
              priority: calculatePriority(engagement, authorFollowers),
            });
          }
        }
      } catch (err) {
        console.error(
          `[Monitor] Error processing keyword "${keyword}":`,
          err,
        );
      }
    }

    // ------------------------------------------------------------------
    // 5. Log summary
    // ------------------------------------------------------------------
    console.log(
      `[Monitor] Processed ${totalProcessed} tweets, ${newMentions} new mentions, ${groupsDiscovered} groups discovered`,
    );
  } catch (err) {
    console.error("[Monitor] Error in monitoring cycle:", err);
  }
}

// ---------------------------------------------------------------------------
// classifyTweet — simple keyword-based classification
// ---------------------------------------------------------------------------

/**
 * Classify a tweet based on keyword heuristics.
 * Returns the type, confidence score (0-1), and any extracted links.
 */
export function classifyTweet(tweet: TweetData): ClassificationResult {
  const textLower = tweet.text.toLowerCase();
  const bioLower = (tweet.author_description ?? "").toLowerCase();
  const combinedText = textLower + " " + bioLower;

  // Extract links from tweet text and author bio
  const extractedLinks = extractGroupLinks(tweet.text + " " + (tweet.author_description ?? ""));

  // Score each category
  const scores: Record<TweetType, number> = {
    pnl_post: 0,
    group_promo: 0,
    scam_report: 0,
    drama: 0,
    general: 0,
    irrelevant: 0,
  };

  // --- PnL post detection ---
  const pnlMatches = countKeywordMatches(textLower, PNL_KEYWORDS);
  if (pnlMatches > 0) {
    scores.pnl_post += pnlMatches * 2;

    // Dollar amounts boost PnL score (e.g. "$1,500" or "+$500")
    const hasDollarAmount = /\+?\$[\d,]+(?:\.\d{2})?/.test(tweet.text);
    if (hasDollarAmount) scores.pnl_post += 3;

    // Percentage pattern boost (e.g. "+15%", "200%")
    const hasPercentage = /[+-]?\d+(?:\.\d+)?%/.test(tweet.text);
    if (hasPercentage) scores.pnl_post += 2;

    // Images strongly suggest PnL screenshots
    const hasImage = tweet.has_media && tweet.media_types?.includes("photo");
    if (hasImage) scores.pnl_post += 3;
  }

  // --- Group promo detection ---
  const promoMatches = countKeywordMatches(textLower, GROUP_PROMO_KEYWORDS);
  if (promoMatches > 0) {
    scores.group_promo += promoMatches * 2;

    // Links in tweet or bio to known platforms
    if (extractedLinks.length > 0) {
      scores.group_promo += extractedLinks.length * 3;
    }

    // Check if bio has promo link patterns
    const bioHasPromoLink = GROUP_PROMO_BIO_PATTERNS.some((p) =>
      p.test(bioLower),
    );
    if (bioHasPromoLink) scores.group_promo += 2;
  }

  // --- Scam report detection ---
  const scamMatches = countKeywordMatches(textLower, SCAM_KEYWORDS);
  if (scamMatches > 0) {
    scores.scam_report += scamMatches * 3; // Higher weight per match
  }

  // --- Drama detection ---
  const dramaMatches = countKeywordMatches(textLower, DRAMA_KEYWORDS);
  if (dramaMatches > 0) {
    scores.drama += dramaMatches * 2;

    // Quote tweets criticizing someone boost drama score
    const isQuoteTweet = tweet.referenced_tweets?.some(
      (rt) => rt.type === "quoted",
    );
    if (isQuoteTweet) scores.drama += 2;
  }

  // --- General crypto content ---
  const cryptoMatches = countKeywordMatches(combinedText, CRYPTO_KEYWORDS);
  if (cryptoMatches > 0) {
    scores.general += Math.min(cryptoMatches, 3); // Cap the general score
  }

  // Find the highest scoring type
  let bestType: TweetType = "irrelevant";
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores) as Array<
    [TweetType, number]
  >) {
    if (type === "irrelevant") continue;
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  // Minimum threshold: at least score of 2 to be classified
  if (bestScore < 2) {
    return { type: "irrelevant", confidence: 0, extractedLinks: [] };
  }

  // Normalize confidence to 0-1 range (cap at 15 points = 1.0)
  const confidence = Math.min(bestScore / 15, 1);

  return {
    type: bestType,
    confidence: Math.round(confidence * 100) / 100,
    extractedLinks,
  };
}

// ---------------------------------------------------------------------------
// extractGroupLinks — regex extraction of platform links
// ---------------------------------------------------------------------------

/**
 * Extract Telegram, Discord, and Whop links from text.
 * Returns an array of { platform, url, handle }.
 */
export function extractGroupLinks(text: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];

  for (const { platform, regex } of LINK_PATTERNS) {
    // Reset regex state for global patterns
    regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const handle = match[1] ?? "";
      // Reconstruct the full URL
      let url: string;
      switch (platform) {
        case "telegram":
          url = `https://t.me/${handle}`;
          break;
        case "discord":
          url = `https://discord.gg/${handle}`;
          break;
        case "whop":
          url = `https://whop.com/${handle}`;
          break;
        default:
          url = match[0];
      }

      links.push({ platform, url, handle });
    }
  }

  return links;
}

// ---------------------------------------------------------------------------
// determineSentiment — simple keyword-based sentiment
// ---------------------------------------------------------------------------

/**
 * Determine the sentiment of a text based on positive vs negative keyword counts.
 */
export function determineSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();

  const positiveCount = countKeywordMatches(lower, POSITIVE_KEYWORDS);
  const negativeCount = countKeywordMatches(lower, NEGATIVE_KEYWORDS);

  if (positiveCount > negativeCount && positiveCount >= 1) {
    return "positive";
  }
  if (negativeCount > positiveCount && negativeCount >= 1) {
    return "negative";
  }
  return "neutral";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Count how many keywords from the list appear in the text.
 * Uses word boundary-aware matching for accuracy.
 */
function countKeywordMatches(text: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    // For short/special keywords like "+%", "$", do simple includes
    if (kw.length <= 2 || /[^a-zA-Z]/.test(kw)) {
      if (text.includes(kw.toLowerCase())) count++;
    } else {
      // Word-boundary match for longer keywords
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(text)) count++;
    }
  }
  return count;
}

/**
 * Calculate total engagement from public metrics.
 */
function calculateEngagement(
  metrics?: TweetData["public_metrics"],
): number {
  if (!metrics) return 0;
  return (
    (metrics.like_count ?? 0) +
    (metrics.retweet_count ?? 0) * 2 +
    (metrics.reply_count ?? 0) +
    (metrics.quote_count ?? 0) * 2
  );
}

/**
 * Deduplicate links by URL.
 */
function deduplicateLinks(links: ExtractedLink[]): ExtractedLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const normalized = link.url.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

/**
 * Try to match a link to an existing approved group.
 * Matches by platform URL or platform handle in the signal_groups table.
 */
function matchLinkToGroup(
  link: ExtractedLink,
  groups: SignalGroup[],
): SignalGroup | null {
  for (const group of groups) {
    // Match by platform URL
    if (
      group.platform_url &&
      link.url.toLowerCase().includes(group.platform_url.toLowerCase())
    ) {
      return group;
    }
    // Match by platform handle
    if (
      group.platform_handle &&
      link.handle.toLowerCase() === group.platform_handle.toLowerCase()
    ) {
      return group;
    }
    // Match by slug or name similarity with handle
    if (
      link.handle.toLowerCase() === group.slug?.toLowerCase() ||
      link.handle.toLowerCase() === group.name?.toLowerCase().replace(/\s+/g, "")
    ) {
      return group;
    }
  }
  return null;
}

/**
 * Derive a group name from a link and author username.
 */
function deriveGroupName(link: ExtractedLink, authorUsername: string): string {
  // Use the handle from the link if meaningful
  const handle = link.handle.split("/")[0] ?? link.handle;
  if (handle && handle.length > 2) {
    return handle;
  }
  return `${authorUsername}-${link.platform}`;
}

/**
 * Create a URL-friendly slug from a string.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

/**
 * Map a tweet classification type to a bot queue action type.
 */
function mapTypeToAction(type: TweetType): string {
  switch (type) {
    case "pnl_post":
      return "pnl_commentary";
    case "group_promo":
      return "group_discovery";
    case "scam_report":
      return "scam_alert";
    case "drama":
      return "general_ct";
    case "general":
      return "general_ct";
    default:
      return "general_ct";
  }
}

/**
 * Calculate a priority score for the bot queue (higher = more urgent).
 * Range: 0-10
 */
function calculatePriority(engagement: number, followers: number): number {
  let priority = 0;

  // Engagement-based priority
  if (engagement > 1000) priority += 4;
  else if (engagement > 500) priority += 3;
  else if (engagement > 100) priority += 2;
  else priority += 1;

  // Follower-based priority
  if (followers > 100_000) priority += 4;
  else if (followers > 50_000) priority += 3;
  else if (followers > 10_000) priority += 2;
  else if (followers > 5_000) priority += 1;

  return Math.min(priority, 10);
}
