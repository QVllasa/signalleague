"use server";

import { z } from "zod";
import { db } from "@/db";
import { tradeRatings, signalGroups } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const tradeRatingSchema = z.object({
  groupId: z.string().uuid(),
  outcome: z.enum(["win", "loss", "breakeven", "unknown"]),
  returnPct: z.coerce.number().min(-100).max(10000).optional(),
  description: z.string().max(500).optional(),
  tradeDate: z.string().optional(),
});

export async function submitTradeRating(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to submit a trade rating" };
  }

  const raw = {
    groupId: formData.get("groupId") as string,
    outcome: formData.get("outcome") as string,
    returnPct: (formData.get("returnPct") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    tradeDate: (formData.get("tradeDate") as string) || undefined,
  };

  const parsed = tradeRatingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  try {
    await db.insert(tradeRatings).values({
      groupId: data.groupId,
      userId: session.user.id,
      outcome: data.outcome,
      returnPct: data.returnPct != null ? data.returnPct.toString() : null,
      description: data.description || null,
      tradeDate: data.tradeDate || null,
    });

    // Update group totalTradeRatings count and winRate
    await db
      .update(signalGroups)
      .set({
        totalTradeRatings: sql`(
          SELECT COUNT(*)::int
          FROM trade_ratings
          WHERE group_id = ${data.groupId}
        )`,
        winRate: sql`(
          SELECT CASE
            WHEN (
              SELECT COUNT(*)
              FROM trade_ratings
              WHERE group_id = ${data.groupId}
                AND outcome IN ('win', 'loss')
            ) = 0 THEN NULL
            ELSE ROUND(
              (
                SELECT COUNT(*)::numeric
                FROM trade_ratings
                WHERE group_id = ${data.groupId}
                  AND outcome = 'win'
              ) / (
                SELECT COUNT(*)::numeric
                FROM trade_ratings
                WHERE group_id = ${data.groupId}
                  AND outcome IN ('win', 'loss')
              ) * 100,
              2
            )::text
          END
        )`,
        updatedAt: new Date(),
      })
      .where(eq(signalGroups.id, data.groupId));

    revalidatePath("/groups");

    return { success: true };
  } catch (error) {
    console.error("[TradeRatings] Submit error:", error);
    return { error: "Failed to submit trade rating. Please try again." };
  }
}

export async function getTradeStats(groupId: string) {
  const [result] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      wins: sql<number>`COUNT(*) FILTER (WHERE outcome = 'win')::int`,
      losses: sql<number>`COUNT(*) FILTER (WHERE outcome = 'loss')::int`,
      breakeven: sql<number>`COUNT(*) FILTER (WHERE outcome = 'breakeven')::int`,
      avgReturn: sql<number>`COALESCE(ROUND(AVG(return_pct::numeric), 1), 0)`,
      winRate: sql<number | null>`
        CASE
          WHEN COUNT(*) FILTER (WHERE outcome IN ('win', 'loss')) = 0 THEN NULL
          ELSE ROUND(
            COUNT(*) FILTER (WHERE outcome = 'win')::numeric
            / COUNT(*) FILTER (WHERE outcome IN ('win', 'loss'))::numeric
            * 100,
            1
          )
        END
      `,
    })
    .from(tradeRatings)
    .where(eq(tradeRatings.groupId, groupId));

  return {
    total: result.total ?? 0,
    wins: result.wins ?? 0,
    losses: result.losses ?? 0,
    breakeven: result.breakeven ?? 0,
    avgReturn: Number(result.avgReturn) || 0,
    winRate: result.winRate != null ? Number(result.winRate) : null,
  };
}
