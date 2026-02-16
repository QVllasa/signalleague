import { db } from "@/db";
import { signalGroups, scamFlags, reports, tradeRatings, twitterMentions } from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface RedFlag {
  flag: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

type Severity = RedFlag["severity"];

// ─── Severity Ordering ──────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

// ─── Detection Rules ────────────────────────────────────────────────────────────

async function detectOnlyShowsWinners(groupId: string): Promise<RedFlag | null> {
  const [stats] = await db
    .select({
      totalRatings: sql<number>`COUNT(*)::int`,
      winCount: sql<number>`COUNT(*) FILTER (WHERE outcome = 'win')::int`,
    })
    .from(tradeRatings)
    .where(eq(tradeRatings.groupId, groupId));

  const total = Number(stats?.totalRatings ?? 0);
  const wins = Number(stats?.winCount ?? 0);

  if (total >= 10 && total > 0 && (wins / total) > 0.9) {
    return {
      flag: "only_shows_winners",
      description: `Win rate is suspiciously high (${Math.round((wins / total) * 100)}% across ${total} rated trades). Legitimate groups show losses too.`,
      severity: "high",
    };
  }

  return null;
}

async function detectAccountTooNew(groupId: string): Promise<RedFlag | null> {
  const [group] = await db
    .select({
      foundedAt: signalGroups.foundedAt,
    })
    .from(signalGroups)
    .where(eq(signalGroups.id, groupId))
    .limit(1);

  if (!group?.foundedAt) return null;

  const founded = new Date(group.foundedAt);
  const now = new Date();
  const monthsActive =
    (now.getFullYear() - founded.getFullYear()) * 12 +
    (now.getMonth() - founded.getMonth());

  if (monthsActive < 3) {
    return {
      flag: "account_too_new",
      description: `Group was founded less than 3 months ago (${monthsActive} month${monthsActive !== 1 ? "s" : ""} old). New groups have no proven track record.`,
      severity: "medium",
    };
  }

  return null;
}

async function detectMultipleScamReports(groupId: string): Promise<RedFlag | null> {
  const [stats] = await db
    .select({
      scamReportCount: sql<number>`COUNT(*)::int`,
    })
    .from(reports)
    .where(
      and(
        eq(reports.reason, "scam"),
        eq(reports.targetType, "group"),
        eq(reports.targetId, groupId),
      ),
    );

  const count = Number(stats?.scamReportCount ?? 0);

  if (count >= 5) {
    return {
      flag: "multiple_scam_reports",
      description: `${count} users have reported this group as a scam. Exercise extreme caution.`,
      severity: "critical",
    };
  }

  if (count >= 3) {
    return {
      flag: "multiple_scam_reports",
      description: `${count} users have reported this group as a scam. Proceed with caution.`,
      severity: "high",
    };
  }

  return null;
}

async function detectHighPrice(groupId: string): Promise<RedFlag | null> {
  const [group] = await db
    .select({
      price: signalGroups.price,
    })
    .from(signalGroups)
    .where(eq(signalGroups.id, groupId))
    .limit(1);

  if (!group?.price) return null;

  const price = Number(group.price);

  if (price > 200) {
    return {
      flag: "high_price",
      description: `Subscription price ($${price}) is unusually high. Most legitimate groups charge under $200/month.`,
      severity: "medium",
    };
  }

  return null;
}

async function detectNegativeSentiment(groupId: string): Promise<RedFlag | null> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [stats] = await db
    .select({
      totalMentions: sql<number>`COUNT(*)::int`,
      negativeMentions: sql<number>`COUNT(*) FILTER (WHERE sentiment = 'negative')::int`,
    })
    .from(twitterMentions)
    .where(
      and(
        eq(twitterMentions.groupId, groupId),
        gte(twitterMentions.tweetedAt, thirtyDaysAgo),
      ),
    );

  const total = Number(stats?.totalMentions ?? 0);
  const negative = Number(stats?.negativeMentions ?? 0);

  if (total >= 5 && total > 0 && (negative / total) > 0.6) {
    return {
      flag: "negative_sentiment",
      description: `${Math.round((negative / total) * 100)}% of ${total} recent Twitter mentions are negative. The community has concerns about this group.`,
      severity: "high",
    };
  }

  return null;
}

// ─── Main Detection Function ────────────────────────────────────────────────────

export async function detectScamFlags(groupId: string): Promise<RedFlag[]> {
  // Run all detection rules in parallel
  const results = await Promise.all([
    detectOnlyShowsWinners(groupId),
    detectAccountTooNew(groupId),
    detectMultipleScamReports(groupId),
    detectHighPrice(groupId),
    detectNegativeSentiment(groupId),
  ]);

  // Filter out null results
  const flags: RedFlag[] = results.filter(
    (result): result is RedFlag => result !== null,
  );

  // Delete old auto-detected scam flags for this group
  await db
    .delete(scamFlags)
    .where(
      and(
        eq(scamFlags.groupId, groupId),
        eq(scamFlags.autoDetected, 1),
      ),
    );

  // Insert new flags
  if (flags.length > 0) {
    await db.insert(scamFlags).values(
      flags.map((f) => ({
        groupId,
        flag: f.flag,
        description: f.description,
        severity: f.severity,
        autoDetected: 1,
      })),
    );
  }

  // Determine max severity across all flags (or "low" if none)
  const overallRisk: Severity = flags.reduce<Severity>(
    (max, f) => maxSeverity(max, f.severity),
    "low",
  );

  // Update the group's scamRisk field
  await db
    .update(signalGroups)
    .set({ scamRisk: overallRisk, updatedAt: new Date() })
    .where(eq(signalGroups.id, groupId));

  return flags;
}
