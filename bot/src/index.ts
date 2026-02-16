import "dotenv/config";
import { config } from "./config.js";
import { initDb, closeDb } from "./db.js";
import { startMonitor } from "./monitor.js";
import { startScheduler, stopScheduler } from "./scheduler.js";

async function main() {
  console.log("[SignalLeague Bot] Starting...");

  await initDb();
  console.log("[Bot] Database connected");

  // Start monitoring pipeline (checks Twitter every 2 minutes)
  startMonitor();
  console.log("[Bot] Monitor pipeline started");

  // Start posting scheduler (checks queue every minute)
  const schedulerJob = startScheduler();
  console.log("[Bot] Posting scheduler started");

  console.log("[SignalLeague Bot] Running. Press Ctrl+C to stop.");

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Bot] Shutting down...");
    stopScheduler(schedulerJob);
    await closeDb();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[Bot] Fatal error:", err);
  process.exit(1);
});
