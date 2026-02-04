export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users, signalGroups, reviews, reports, waitlist } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

async function getStats() {
  const [
    [userCount],
    [groupCount],
    [pendingGroupCount],
    [reviewCount],
    [reportCount],
    [waitlistCount],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db.select({ count: sql<number>`count(*)::int` }).from(signalGroups),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(signalGroups)
      .where(eq(signalGroups.status, "pending")),
    db.select({ count: sql<number>`count(*)::int` }).from(reviews),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reports)
      .where(eq(reports.status, "pending")),
    db.select({ count: sql<number>`count(*)::int` }).from(waitlist),
  ]);

  return {
    users: userCount.count,
    groups: groupCount.count,
    pendingGroups: pendingGroupCount.count,
    reviews: reviewCount.count,
    pendingReports: reportCount.count,
    waitlist: waitlistCount.count,
  };
}

export default async function AdminOverviewPage() {
  const stats = await getStats();

  const cards = [
    { label: "Total Users", value: stats.users, color: "text-primary" },
    { label: "Signal Groups", value: stats.groups, color: "text-tertiary" },
    {
      label: "Pending Groups",
      value: stats.pendingGroups,
      color: stats.pendingGroups > 0 ? "text-tier-s" : "text-muted-foreground",
    },
    { label: "Reviews", value: stats.reviews, color: "text-primary" },
    {
      label: "Pending Reports",
      value: stats.pendingReports,
      color: stats.pendingReports > 0 ? "text-destructive" : "text-muted-foreground",
    },
    { label: "Waitlist", value: stats.waitlist, color: "text-secondary" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl tracking-wider text-foreground">
        Admin <span className="text-primary">Overview</span>
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
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
    </div>
  );
}
