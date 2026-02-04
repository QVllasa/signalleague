import { db } from "@/db";
import { signalGroups, reviews, tierRankings, tierHistory } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import type { Tier } from "@/types";

// ─── Algorithm Weights ──────────────────────────────────────────
const WEIGHTS = {
  reviews: 0.4,
  volume: 0.2,
  consistency: 0.15,
  activity: 0.15,
  community: 0.1,
} as const;

// ─── Tier Thresholds (score 0-100) ─────────────────────────────
function scoreToTier(score: number): Tier {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 45) return "C";
  if (score >= 30) return "D";
  return "F";
}

// ─── Tier Calculation ───────────────────────────────────────────
interface GroupStats {
  groupId: string;
  avgRating: number;
  reviewCount: number;
  stdDev: number;
  recentReviewCount: number;
  avgHelpful: number;
}

async function getGroupStats(groupId: string): Promise<GroupStats | null> {
  const [stats] = await db
    .select({
      avgRating: sql<number>`COALESCE(AVG(overall_rating::numeric), 0)`,
      reviewCount: sql<number>`COUNT(*)::int`,
      stdDev: sql<number>`COALESCE(STDDEV(overall_rating::numeric), 0)`,
      recentReviewCount: sql<number>`
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days')::int
      `,
      avgHelpful: sql<number>`COALESCE(AVG(helpful_count::numeric), 0)`,
    })
    .from(reviews)
    .where(and(eq(reviews.groupId, groupId), eq(reviews.status, "published")));

  if (stats.reviewCount === 0) return null;

  return {
    groupId,
    avgRating: Number(stats.avgRating),
    reviewCount: Number(stats.reviewCount),
    stdDev: Number(stats.stdDev),
    recentReviewCount: Number(stats.recentReviewCount),
    avgHelpful: Number(stats.avgHelpful),
  };
}

function calculateTierScore(stats: GroupStats): number {
  // 1. Review Quality Score (0-100) — avg rating normalized to 100
  const reviewScore = (stats.avgRating / 5) * 100;

  // 2. Volume Score (0-100) — more reviews = higher score, diminishing returns
  const volumeScore = Math.min(100, (Math.log2(stats.reviewCount + 1) / Math.log2(51)) * 100);

  // 3. Consistency Score (0-100) — lower std dev = more consistent = higher score
  const maxStdDev = 2.0;
  const consistencyScore = Math.max(0, (1 - stats.stdDev / maxStdDev) * 100);

  // 4. Activity Score (0-100) — recent reviews relative to total
  const activityRatio =
    stats.reviewCount > 0
      ? stats.recentReviewCount / stats.reviewCount
      : 0;
  const activityScore = Math.min(100, activityRatio * 100 + (stats.recentReviewCount > 0 ? 30 : 0));

  // 5. Community Score (0-100) — average helpful votes
  const communityScore = Math.min(100, stats.avgHelpful * 20);

  // Weighted total
  const totalScore =
    reviewScore * WEIGHTS.reviews +
    volumeScore * WEIGHTS.volume +
    consistencyScore * WEIGHTS.consistency +
    activityScore * WEIGHTS.activity +
    communityScore * WEIGHTS.community;

  return Math.round(totalScore * 100) / 100;
}

// ─── Public API ─────────────────────────────────────────────────

export async function calculateGroupTier(groupId: string) {
  const stats = await getGroupStats(groupId);

  if (!stats) {
    // Not enough data — set as UNRANKED
    const existing = await db
      .select({ id: tierRankings.id })
      .from(tierRankings)
      .where(eq(tierRankings.groupId, groupId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(tierRankings)
        .set({ tier: "UNRANKED", totalScore: null, calculatedAt: new Date() })
        .where(eq(tierRankings.groupId, groupId));
    } else {
      await db.insert(tierRankings).values({
        groupId,
        tier: "UNRANKED",
        calculatedAt: new Date(),
      });
    }

    return { tier: "UNRANKED" as Tier, score: 0 };
  }

  const totalScore = calculateTierScore(stats);
  const tier = scoreToTier(totalScore);

  // Upsert tier ranking
  const existing = await db
    .select({ id: tierRankings.id })
    .from(tierRankings)
    .where(eq(tierRankings.groupId, groupId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(tierRankings)
      .set({
        tier,
        algorithmScore: totalScore.toString(),
        totalScore: totalScore.toString(),
        calculatedAt: new Date(),
      })
      .where(eq(tierRankings.groupId, groupId));
  } else {
    await db.insert(tierRankings).values({
      groupId,
      tier,
      algorithmScore: totalScore.toString(),
      totalScore: totalScore.toString(),
      calculatedAt: new Date(),
    });
  }

  // Record in history
  await db.insert(tierHistory).values({
    groupId,
    tier,
    totalScore: totalScore.toString(),
  });

  return { tier, score: totalScore };
}

export async function recalculateAllTiers() {
  const groups = await db
    .select({ id: signalGroups.id })
    .from(signalGroups)
    .where(eq(signalGroups.status, "approved"));

  const results = [];
  for (const group of groups) {
    const result = await calculateGroupTier(group.id);
    results.push({ groupId: group.id, ...result });
  }

  return results;
}
