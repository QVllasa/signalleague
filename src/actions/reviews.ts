"use server";

import { z } from "zod";
import { db } from "@/db";
import { reviews, signalGroups, reviewVotes, reports } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const ratingField = z.coerce.number().min(1).max(5).step(0.5);

const reviewSchema = z.object({
  groupId: z.string().uuid(),
  overallRating: ratingField,
  signalQuality: ratingField,
  riskManagement: ratingField,
  valueForMoney: ratingField,
  communitySupport: ratingField,
  transparency: ratingField,
  title: z.string().min(3).max(100).optional(),
  body: z.string().min(20, "Review must be at least 20 characters").max(5000).optional(),
  membershipDuration: z.enum([
    "less_than_1_month",
    "1_to_3_months",
    "3_to_6_months",
    "6_to_12_months",
    "over_1_year",
  ]).optional(),
  pros: z.string().optional(),
  cons: z.string().optional(),
});

export async function submitReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to write a review" };
  }

  const raw = {
    groupId: formData.get("groupId") as string,
    overallRating: formData.get("overallRating") as string,
    signalQuality: formData.get("signalQuality") as string,
    riskManagement: formData.get("riskManagement") as string,
    valueForMoney: formData.get("valueForMoney") as string,
    communitySupport: formData.get("communitySupport") as string,
    transparency: formData.get("transparency") as string,
    title: (formData.get("title") as string) || undefined,
    body: (formData.get("body") as string) || undefined,
    membershipDuration: (formData.get("membershipDuration") as string) || undefined,
    pros: (formData.get("pros") as string) || undefined,
    cons: (formData.get("cons") as string) || undefined,
  };

  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Check if user already reviewed this group
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.userId, session.user.id),
        eq(reviews.groupId, data.groupId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { error: "You have already reviewed this group" };
  }

  // Parse pros/cons from comma-separated strings
  const prosArray = data.pros
    ? data.pros.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  const consArray = data.cons
    ? data.cons.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  try {
    await db.insert(reviews).values({
      userId: session.user.id,
      groupId: data.groupId,
      overallRating: data.overallRating.toString(),
      signalQuality: data.signalQuality.toString(),
      riskManagement: data.riskManagement.toString(),
      valueForMoney: data.valueForMoney.toString(),
      communitySupport: data.communitySupport.toString(),
      transparency: data.transparency.toString(),
      title: data.title || null,
      body: data.body || null,
      membershipDuration: data.membershipDuration || null,
      pros: prosArray,
      cons: consArray,
    });

    // Update group avg score and review count
    await db
      .update(signalGroups)
      .set({
        avgScore: sql`(
          SELECT ROUND(AVG(overall_rating::numeric), 1)::text
          FROM reviews
          WHERE group_id = ${data.groupId} AND status = 'published'
        )`,
        reviewCount: sql`(
          SELECT COUNT(*)::int
          FROM reviews
          WHERE group_id = ${data.groupId} AND status = 'published'
        )`,
        updatedAt: new Date(),
      })
      .where(eq(signalGroups.id, data.groupId));

    // Get slug for revalidation
    const [group] = await db
      .select({ slug: signalGroups.slug })
      .from(signalGroups)
      .where(eq(signalGroups.id, data.groupId))
      .limit(1);

    if (group) {
      revalidatePath(`/groups/${group.slug}`);
    }
    revalidatePath("/groups");
    revalidatePath("/leaderboard");

    return { success: true };
  } catch (error) {
    console.error("[Reviews] Submit error:", error);
    return { error: "Failed to submit review. Please try again." };
  }
}

export async function voteOnReview(reviewId: string, voteType: "helpful" | "unhelpful") {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to vote" };
  }

  try {
    // Check existing vote
    const existing = await db
      .select()
      .from(reviewVotes)
      .where(
        and(
          eq(reviewVotes.userId, session.user.id),
          eq(reviewVotes.reviewId, reviewId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing vote
      await db
        .update(reviewVotes)
        .set({ voteType })
        .where(eq(reviewVotes.id, existing[0].id));
    } else {
      // Insert new vote
      await db.insert(reviewVotes).values({
        userId: session.user.id,
        reviewId,
        voteType,
      });
    }

    // Update helpful count on review
    await db
      .update(reviews)
      .set({
        helpfulCount: sql`(
          SELECT COUNT(*)::int
          FROM review_votes
          WHERE review_id = ${reviewId} AND vote_type = 'helpful'
        )`,
      })
      .where(eq(reviews.id, reviewId));

    return { success: true };
  } catch (error) {
    console.error("[Reviews] Vote error:", error);
    return { error: "Failed to submit vote" };
  }
}

export async function reportContent(
  targetType: "review" | "group",
  targetId: string,
  reason: "spam" | "fake_review" | "scam" | "inappropriate" | "other",
  description?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to report" };
  }

  try {
    await db.insert(reports).values({
      userId: session.user.id,
      targetType,
      targetId,
      reason,
      description: description || null,
    });

    return { success: true };
  } catch (error) {
    console.error("[Reports] Error:", error);
    return { error: "Failed to submit report" };
  }
}
