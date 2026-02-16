/**
 * Posting pipeline for the SignalLeague Twitter bot.
 *
 * Processes the bot_queue table: generates content when needed,
 * posts tweets (original, reply, or quote), and updates queue status.
 */

import { getTwitterClient } from "./twitter.js";
import { getGenerator } from "./generator.js";
import { query, updateBotQueueStatus, getBotConfig } from "./db.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up a single config value from the bot_config rows, with a fallback. */
function getConfigValue(
  configs: { key: string; value: string }[],
  key: string,
  defaultValue: string,
): string {
  const row = configs.find((c) => c.key === key);
  return row?.value ?? defaultValue;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Process the next queued item in bot_queue.
 *
 * Steps:
 *  1. Check bot_enabled config (bail if disabled)
 *  2. Enforce max_posts_per_hour rate limit
 *  3. Pick the next eligible queued item
 *  4. Generate content if the item has none
 *  5. Post via the Twitter client (tweet / reply / quote)
 *  6. Update queue status to "posted" or "failed"
 */
export async function processQueue(): Promise<void> {
  // ── 1. Check if bot is enabled ──────────────────────────────────────────
  const configs = await getBotConfig();
  const botEnabled = getConfigValue(configs, "bot_enabled", "true");

  if (botEnabled === "false") {
    console.log("[Poster] Bot disabled — skipping queue processing");
    return;
  }

  // ── 2. Enforce hourly rate limit ────────────────────────────────────────
  const maxPostsPerHour = parseInt(
    getConfigValue(configs, "max_posts_per_hour", "3"),
    10,
  );

  const recentPostsResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM bot_queue
     WHERE status = 'posted'
       AND posted_at > NOW() - INTERVAL '1 hour'`,
  );
  const recentPostCount = parseInt(recentPostsResult.rows[0]?.count ?? "0", 10);

  if (recentPostCount >= maxPostsPerHour) {
    console.log(
      `[Poster] Rate limit reached (${recentPostCount}/${maxPostsPerHour} posts in the last hour)`,
    );
    return;
  }

  // ── 3. Get next queued item ─────────────────────────────────────────────
  const nextItemResult = await query(
    `SELECT *
     FROM bot_queue
     WHERE status = 'queued'
       AND (scheduled_for IS NULL OR scheduled_for <= NOW())
     ORDER BY created_at ASC
     LIMIT 1`,
  );

  const item = nextItemResult.rows[0];
  if (!item) {
    return; // nothing to process
  }

  // ── 4. Generate content if empty ────────────────────────────────────────
  let content: string = item.content;

  if (!content || content.trim() === "") {
    console.log(
      `[Poster] Generating content for queue item ${item.id} (type: ${item.post_type})`,
    );

    const generator = getGenerator();

    // Build a context object from whatever trigger data is stored on the item.
    // The trigger_tweet_id and related_group_id can serve as context hints;
    // each post_type template in prompts.ts expects a different shape, so we
    // pass a generic bag and let the template destructure what it needs.
    const triggerContext: Record<string, any> = {
      ...(typeof item.trigger_context === "object" && item.trigger_context !== null
        ? item.trigger_context
        : {}),
      postType: item.post_type,
      triggerTweetId: item.trigger_tweet_id,
      relatedGroupId: item.related_group_id,
    };

    const generated = await generator.generateWithRetry(
      item.post_type,
      triggerContext,
    );

    if (!generated) {
      console.error(
        `[Poster] Content generation failed for queue item ${item.id}`,
      );
      await updateBotQueueStatus(item.id, "failed", {
        error_message: "Content generation returned null",
      });
      return;
    }

    content = generated;

    // Persist the generated content back to the queue row
    await query("UPDATE bot_queue SET content = $1 WHERE id = $2", [
      content,
      item.id,
    ]);
  }

  // ── 5. Post via Twitter ─────────────────────────────────────────────────
  try {
    const twitter = getTwitterClient();
    let postedTweetId: string;

    if (item.reply_to_tweet_id) {
      // Reply to an existing tweet
      const result = await twitter.v2.reply(content, item.reply_to_tweet_id);
      postedTweetId = result.data.id;
      console.log(
        `[Poster] Posted reply ${postedTweetId} to tweet ${item.reply_to_tweet_id}`,
      );
    } else if (item.quote_tweet_id) {
      // Quote-tweet an existing tweet
      const result = await twitter.v2.quote(content, item.quote_tweet_id);
      postedTweetId = result.data.id;
      console.log(
        `[Poster] Posted quote tweet ${postedTweetId} quoting ${item.quote_tweet_id}`,
      );
    } else {
      // Original tweet
      const result = await twitter.v2.tweet(content);
      postedTweetId = result.data.id;
      console.log(`[Poster] Posted tweet ${postedTweetId}`);
    }

    // ── 6a. Success: mark as posted ─────────────────────────────────────
    await query(
      `UPDATE bot_queue
       SET status = 'posted',
           posted_tweet_id = $1,
           posted_at = NOW()
       WHERE id = $2`,
      [postedTweetId, item.id],
    );

    console.log(`[Poster] Queue item ${item.id} marked as posted`);
  } catch (error: any) {
    // ── 6b. Failure: mark as failed ─────────────────────────────────────
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await query(
      `UPDATE bot_queue
       SET status = 'failed',
           error_message = $1
       WHERE id = $2`,
      [errorMessage, item.id],
    );

    console.error(
      `[Poster] Failed to post queue item ${item.id}: ${errorMessage}`,
    );
  }
}
