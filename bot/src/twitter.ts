/**
 * Twitter API v2 client wrapper for the SignalLeague bot.
 * Provides methods for searching tweets, posting, and user lookup
 * with built-in retry logic for rate limit handling.
 */

import { TwitterApi } from "twitter-api-v2";
import type {
  TwitterApiReadOnly,
  TwitterApiReadWrite,
  TweetV2,
  UserV2,
  TweetSearchRecentV2Paginator,
  TweetV2SingleResult,
} from "twitter-api-v2";
import { config } from "./config.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 5_000; // 5 seconds

// ---------------------------------------------------------------------------
// TwitterClient
// ---------------------------------------------------------------------------

export class TwitterClient {
  private readClient: TwitterApiReadOnly;
  private writeClient: TwitterApi;

  /**
   * Expose the v2 API directly for callers that need raw access
   * (e.g. poster.ts uses `twitter.v2.reply()` etc.).
   */
  get v2(): TwitterApiReadWrite["v2"] {
    return this.writeClient.v2;
  }

  constructor() {
    // Read-only client using bearer token (for search, user lookup)
    this.readClient = new TwitterApi(config.twitterBearerToken).readOnly;

    // Read-write client using OAuth 1.0a user context (for posting)
    this.writeClient = new TwitterApi({
      appKey: config.twitterApiKey,
      appSecret: config.twitterApiSecret,
      accessToken: config.twitterAccessToken,
      accessSecret: config.twitterAccessSecret,
    });
  }

  // -------------------------------------------------------------------------
  // Search recent tweets
  // -------------------------------------------------------------------------

  /**
   * Search recent tweets (last 7 days) matching a query.
   * Returns tweets with author info via the author_id expansion.
   */
  async searchRecent(
    query: string,
    maxResults: number = 10,
  ): Promise<{
    tweets: TweetV2[];
    includes: TweetSearchRecentV2Paginator["includes"];
  }> {
    return this.withRetry(async () => {
      console.log(`[Twitter] searchRecent: query="${query}", maxResults=${maxResults}`);

      const paginator = await this.readClient.v2.search(query, {
        max_results: Math.min(Math.max(maxResults, 10), 100),
        "tweet.fields": [
          "public_metrics",
          "created_at",
          "author_id",
          "entities",
          "attachments",
        ],
        "user.fields": [
          "username",
          "name",
          "public_metrics",
          "description",
          "verified",
        ],
        expansions: ["author_id", "attachments.media_keys"],
        "media.fields": ["type", "url"],
      });

      const tweets = paginator.tweets ?? [];
      console.log(`[Twitter] searchRecent: found ${tweets.length} tweets`);

      return {
        tweets,
        includes: paginator.includes,
      };
    });
  }

  // -------------------------------------------------------------------------
  // Get single tweet
  // -------------------------------------------------------------------------

  /**
   * Retrieve a single tweet by its ID.
   */
  async getTweet(tweetId: string): Promise<TweetV2 | null> {
    return this.withRetry(async () => {
      console.log(`[Twitter] getTweet: id=${tweetId}`);

      const result: TweetV2SingleResult = await this.readClient.v2.singleTweet(
        tweetId,
        {
          "tweet.fields": [
            "public_metrics",
            "created_at",
            "author_id",
            "entities",
            "attachments",
          ],
          "user.fields": ["username", "public_metrics"],
          expansions: ["author_id"],
        },
      );

      return result.data ?? null;
    });
  }

  // -------------------------------------------------------------------------
  // Get user by handle
  // -------------------------------------------------------------------------

  /**
   * Look up a Twitter user by their handle (username without @).
   */
  async getUserByHandle(handle: string): Promise<UserV2 | null> {
    return this.withRetry(async () => {
      const cleanHandle = handle.replace(/^@/, "");
      console.log(`[Twitter] getUserByHandle: handle=${cleanHandle}`);

      const result = await this.readClient.v2.userByUsername(cleanHandle, {
        "user.fields": [
          "created_at",
          "description",
          "public_metrics",
          "verified",
          "profile_image_url",
        ],
      });

      return result.data ?? null;
    });
  }

  // -------------------------------------------------------------------------
  // Post tweet
  // -------------------------------------------------------------------------

  /**
   * Post a tweet, optionally as a reply or quote tweet.
   * Returns the posted tweet data.
   */
  async postTweet(
    text: string,
    options?: { replyTo?: string; quoteTweetId?: string },
  ): Promise<{ id: string; text: string }> {
    return this.withRetry(async () => {
      console.log(
        `[Twitter] postTweet: text="${text.substring(0, 50)}..."` +
          (options?.replyTo ? ` replyTo=${options.replyTo}` : "") +
          (options?.quoteTweetId ? ` quote=${options.quoteTweetId}` : ""),
      );

      if (options?.replyTo) {
        const result = await this.writeClient.v2.reply(text, options.replyTo);
        console.log(`[Twitter] Posted reply: id=${result.data.id}`);
        return result.data;
      }

      if (options?.quoteTweetId) {
        const result = await this.writeClient.v2.quote(text, options.quoteTweetId);
        console.log(`[Twitter] Posted quote tweet: id=${result.data.id}`);
        return result.data;
      }

      const result = await this.writeClient.v2.tweet(text);
      console.log(`[Twitter] Posted tweet: id=${result.data.id}`);
      return result.data;
    });
  }

  // -------------------------------------------------------------------------
  // Health check
  // -------------------------------------------------------------------------

  /**
   * Test the API connection by fetching the authenticated user.
   * Returns true if the connection is healthy.
   */
  async isHealthy(): Promise<boolean> {
    try {
      console.log("[Twitter] Health check...");
      const me = await this.writeClient.v2.me();
      console.log(`[Twitter] Healthy — authenticated as @${me.data.username}`);
      return true;
    } catch (err) {
      console.error("[Twitter] Health check failed:", err);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Retry logic with exponential backoff for rate limits
  // -------------------------------------------------------------------------

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;

        // Check if this is a rate limit error (HTTP 429)
        const isRateLimit =
          err?.code === 429 ||
          err?.data?.status === 429 ||
          err?.rateLimitError ||
          (err?.message && String(err.message).includes("429"));

        if (isRateLimit && attempt < MAX_RETRIES) {
          // Try to get the reset time from the error or headers
          const resetEpoch = err?.rateLimit?.reset;
          let waitMs: number;

          if (resetEpoch) {
            // Wait until the rate limit resets, plus a small buffer
            waitMs = Math.max(resetEpoch * 1000 - Date.now(), 0) + 1_000;
          } else {
            // Exponential backoff: 5s, 10s, 20s
            waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          }

          console.warn(
            `[Twitter] Rate limited (attempt ${attempt}/${MAX_RETRIES}). ` +
              `Waiting ${Math.round(waitMs / 1000)}s before retry...`,
          );

          await sleep(waitMs);
          continue;
        }

        // Not a rate limit error, or we've exhausted retries
        if (attempt < MAX_RETRIES) {
          const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.warn(
            `[Twitter] Request failed (attempt ${attempt}/${MAX_RETRIES}): ${err?.message ?? err}. ` +
              `Retrying in ${Math.round(waitMs / 1000)}s...`,
          );
          await sleep(waitMs);
          continue;
        }
      }
    }

    throw lastError;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _client: TwitterClient | null = null;

/**
 * Lazily initialize and return the singleton TwitterClient instance.
 */
export function getTwitterClient(): TwitterClient {
  if (!_client) {
    console.log("[Twitter] Initializing Twitter client...");
    _client = new TwitterClient();
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
