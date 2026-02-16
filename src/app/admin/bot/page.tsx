export const dynamic = "force-dynamic";

import { getBotStats, getBotQueue, getBotConfig } from "@/actions/bot";
import { BotDashboardClient } from "./bot-dashboard-client";

export default async function BotDashboardPage() {
  const [stats, queue, config] = await Promise.all([
    getBotStats(),
    getBotQueue(20),
    getBotConfig(),
  ]);

  const botEnabled = config["bot_enabled"] !== "false";

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl tracking-wider text-foreground">
        Bot <span className="text-primary">Dashboard</span>
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Posts Today", value: stats.postsToday, color: "text-primary" },
          { label: "Posts This Week", value: stats.postsThisWeek, color: "text-tertiary" },
          { label: "Queue Size", value: stats.queueSize, color: stats.queueSize > 0 ? "text-tier-s" : "text-muted-foreground" },
          { label: "Failed", value: stats.failedCount, color: stats.failedCount > 0 ? "text-destructive" : "text-muted-foreground" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-surface-1 border border-border p-5 space-y-1"
          >
            <p className={`font-heading text-3xl ${card.color}`}>
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Client-interactive sections */}
      <BotDashboardClient queue={queue} botEnabled={botEnabled} />
    </div>
  );
}
