import { db } from "@/db";
import { signalGroups, reviews, scamFlags, tradeRatings } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// ─── Transparency Factor Weights (total = 100) ─────────────────

export interface TransparencyFactors {
  showsLosses: number; // max 20
  trackRecordAge: number; // max 15
  verifiedPerformance: number; // max 25
  fairPricing: number; // max 10
  responsiveToCriticism: number; // max 10
  openCommunity: number; // max 10
  noFakeTestimonials: number; // max 10
}

// ─── Helper: clamp value to a range ─────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Factor Calculators ─────────────────────────────────────────

function calcShowsLosses(totalTrades: number, lossTrades: number): number {
  if (totalTrades === 0) return 0;
  const lossRatio = lossTrades / totalTrades;
  // Groups that show losses are more transparent.
  // A healthy loss ratio (20-50%) gets full marks; some losses = partial credit.
  if (lossRatio >= 0.2) return 20;
  if (lossRatio >= 0.1) return 15;
  if (lossRatio > 0) return 10;
  return 0;
}

function calcTrackRecordAge(foundedAt: string | null): number {
  if (!foundedAt) return 0;
  const founded = new Date(foundedAt);
  const now = new Date();
  const monthsActive =
    (now.getFullYear() - founded.getFullYear()) * 12 +
    (now.getMonth() - founded.getMonth());

  if (monthsActive >= 12) return 15;
  if (monthsActive >= 6) return 10;
  if (monthsActive >= 3) return 5;
  return 0;
}

function calcVerifiedPerformance(tradeRatingCount: number): number {
  if (tradeRatingCount >= 20) return 25;
  if (tradeRatingCount >= 10) return 15;
  if (tradeRatingCount >= 5) return 8;
  return 0;
}

function calcFairPricing(
  pricingModel: string,
  price: string | null,
): number {
  if (pricingModel === "free") return 10;
  const numericPrice = price ? Number(price) : 0;
  if (numericPrice <= 50) return 8;
  if (numericPrice <= 100) return 5;
  if (numericPrice <= 200) return 3;
  return 0;
}

function calcResponsiveToCriticism(reviewCount: number): number {
  if (reviewCount >= 5) return 10;
  if (reviewCount >= 2) return 5;
  return 0;
}

function calcOpenCommunity(pricingModel: string): number {
  if (pricingModel === "free") return 10;
  if (pricingModel === "freemium") return 7;
  return 3; // paid
}

function calcNoFakeTestimonials(scamFlagCount: number): number {
  if (scamFlagCount === 0) return 10;
  if (scamFlagCount <= 2) return 5;
  return 0;
}

// ─── Main Calculation ───────────────────────────────────────────

export async function calculateTransparencyScore(
  groupId: string,
): Promise<{ score: number; factors: TransparencyFactors }> {
  // 1. Fetch group data
  const [group] = await db
    .select({
      id: signalGroups.id,
      pricingModel: signalGroups.pricingModel,
      price: signalGroups.price,
      foundedAt: signalGroups.foundedAt,
    })
    .from(signalGroups)
    .where(eq(signalGroups.id, groupId))
    .limit(1);

  if (!group) {
    const emptyFactors: TransparencyFactors = {
      showsLosses: 0,
      trackRecordAge: 0,
      verifiedPerformance: 0,
      fairPricing: 0,
      responsiveToCriticism: 0,
      openCommunity: 0,
      noFakeTestimonials: 0,
    };
    return { score: 0, factors: emptyFactors };
  }

  // 2. Fetch trade rating stats (total trades + losses)
  const [tradeStats] = await db
    .select({
      totalTrades: sql<number>`COUNT(*)::int`,
      lossTrades: sql<number>`COUNT(*) FILTER (WHERE outcome = 'loss')::int`,
    })
    .from(tradeRatings)
    .where(eq(tradeRatings.groupId, groupId));

  const totalTrades = Number(tradeStats?.totalTrades ?? 0);
  const lossTrades = Number(tradeStats?.lossTrades ?? 0);

  // 3. Fetch published review count
  const [reviewStats] = await db
    .select({
      reviewCount: sql<number>`COUNT(*)::int`,
    })
    .from(reviews)
    .where(and(eq(reviews.groupId, groupId), eq(reviews.status, "published")));

  const reviewCount = Number(reviewStats?.reviewCount ?? 0);

  // 4. Fetch scam flag count
  const [flagStats] = await db
    .select({
      flagCount: sql<number>`COUNT(*)::int`,
    })
    .from(scamFlags)
    .where(eq(scamFlags.groupId, groupId));

  const scamFlagCount = Number(flagStats?.flagCount ?? 0);

  // 5. Calculate each factor
  const factors: TransparencyFactors = {
    showsLosses: clamp(calcShowsLosses(totalTrades, lossTrades), 0, 20),
    trackRecordAge: clamp(calcTrackRecordAge(group.foundedAt), 0, 15),
    verifiedPerformance: clamp(calcVerifiedPerformance(totalTrades), 0, 25),
    fairPricing: clamp(calcFairPricing(group.pricingModel, group.price), 0, 10),
    responsiveToCriticism: clamp(calcResponsiveToCriticism(reviewCount), 0, 10),
    openCommunity: clamp(calcOpenCommunity(group.pricingModel), 0, 10),
    noFakeTestimonials: clamp(calcNoFakeTestimonials(scamFlagCount), 0, 10),
  };

  // 6. Sum to get total score (0-100)
  const score =
    factors.showsLosses +
    factors.trackRecordAge +
    factors.verifiedPerformance +
    factors.fairPricing +
    factors.responsiveToCriticism +
    factors.openCommunity +
    factors.noFakeTestimonials;

  // 7. Persist the score back to the signal group
  await db
    .update(signalGroups)
    .set({ transparencyScore: score, updatedAt: new Date() })
    .where(eq(signalGroups.id, groupId));

  return { score, factors };
}

// ─── Bulk Recalculation ─────────────────────────────────────────

export async function recalculateAllTransparencyScores() {
  const groups = await db
    .select({ id: signalGroups.id })
    .from(signalGroups)
    .where(eq(signalGroups.status, "approved"));

  const results = [];
  for (const group of groups) {
    const result = await calculateTransparencyScore(group.id);
    results.push({ groupId: group.id, ...result });
  }

  return results;
}
