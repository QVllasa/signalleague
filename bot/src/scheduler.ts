/**
 * Cron-based scheduler for the SignalLeague Twitter bot.
 *
 * Runs every minute and delegates to the posting pipeline.
 * Respects configurable posting hours (UTC) from bot_config so the bot
 * stays quiet during off-hours.
 */

import { CronJob } from "cron";
import { processQueue } from "./poster.js";
import { getBotConfig } from "./db.js";

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
// Scheduler
// ---------------------------------------------------------------------------

/**
 * Start the posting scheduler.
 *
 * Creates a CronJob that fires every minute. On each tick it:
 *  1. Reads posting_hours_start / posting_hours_end from bot_config
 *  2. Checks whether the current UTC hour falls inside the posting window
 *  3. If inside the window, calls processQueue()
 *
 * @returns The CronJob instance (useful for cleanup via `stopScheduler`).
 */
export function startScheduler(): CronJob {
  const job = new CronJob(
    "* * * * *", // every minute
    async () => {
      try {
        // Fetch configurable posting window (defaults: 8–22 UTC)
        const configs = await getBotConfig();
        const postingStart = parseInt(
          getConfigValue(configs, "posting_hours_start", "8"),
          10,
        );
        const postingEnd = parseInt(
          getConfigValue(configs, "posting_hours_end", "22"),
          10,
        );

        const currentHourUtc = new Date().getUTCHours();

        if (currentHourUtc < postingStart || currentHourUtc >= postingEnd) {
          // Outside posting window — stay quiet
          return;
        }

        await processQueue();

        console.log(
          `[Scheduler] Queue processed at ${new Date().toISOString()}`,
        );
      } catch (err) {
        console.error("[Scheduler] Error during tick:", err);
      }
    },
    null, // onComplete
    true, // start immediately
    "UTC", // always evaluate in UTC
  );

  return job;
}

/**
 * Gracefully stop a running scheduler job.
 */
export function stopScheduler(job: CronJob): void {
  job.stop();
}
