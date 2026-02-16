"use server";

import { z } from "zod";
import { db } from "@/db";
import {
  signalGroups,
  reviews,
  reports,
  users,
  waitlist,
  tradeRatings,
  twitterMentions,
  scamFlags,
} from "@/db/schema";
import { eq, and, or, ilike, ne, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { syncGroupToSearch, removeGroupFromSearch } from "@/lib/sync-search";
import { calculateGroupTier } from "@/lib/ranking";

const idSchema = z.string().uuid("Invalid ID");
const roleSchema = z.enum(["user", "moderator", "admin"]);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

// ─── Group Moderation ───────────────────────────────────────────

export async function approveGroup(groupId: string) {
  await requireAdmin();
  const id = idSchema.parse(groupId);

  try {
    const [group] = await db
      .update(signalGroups)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(signalGroups.id, id))
      .returning({ slug: signalGroups.slug });

    await syncGroupToSearch(id);
    await calculateGroupTier(id);

    revalidatePath("/admin/groups");
    revalidatePath("/groups");
    revalidatePath("/leaderboard");
    if (group?.slug) revalidatePath(`/groups/${group.slug}`);
    return { success: true };
  } catch (error) {
    console.error("[Admin] approveGroup error:", error);
    return { error: "Failed to approve group" };
  }
}

export async function rejectGroup(groupId: string) {
  await requireAdmin();
  const id = idSchema.parse(groupId);

  try {
    await db
      .update(signalGroups)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(signalGroups.id, id));

    await removeGroupFromSearch(id);

    revalidatePath("/admin/groups");
    return { success: true };
  } catch (error) {
    console.error("[Admin] rejectGroup error:", error);
    return { error: "Failed to reject group" };
  }
}

export async function suspendGroup(groupId: string) {
  await requireAdmin();
  const id = idSchema.parse(groupId);

  try {
    const [group] = await db
      .update(signalGroups)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(signalGroups.id, id))
      .returning({ slug: signalGroups.slug });

    await removeGroupFromSearch(id);

    revalidatePath("/admin/groups");
    revalidatePath("/groups");
    revalidatePath("/leaderboard");
    if (group?.slug) revalidatePath(`/groups/${group.slug}`);
    return { success: true };
  } catch (error) {
    console.error("[Admin] suspendGroup error:", error);
    return { error: "Failed to suspend group" };
  }
}

// ─── Review Moderation ──────────────────────────────────────────

export async function flagReview(reviewId: string) {
  await requireAdmin();
  const id = idSchema.parse(reviewId);

  try {
    await db
      .update(reviews)
      .set({ status: "flagged", updatedAt: new Date() })
      .where(eq(reviews.id, id));

    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error) {
    console.error("[Admin] flagReview error:", error);
    return { error: "Failed to flag review" };
  }
}

export async function removeReview(reviewId: string) {
  await requireAdmin();
  const id = idSchema.parse(reviewId);

  try {
    await db
      .update(reviews)
      .set({ status: "removed", updatedAt: new Date() })
      .where(eq(reviews.id, id));

    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error) {
    console.error("[Admin] removeReview error:", error);
    return { error: "Failed to remove review" };
  }
}

export async function restoreReview(reviewId: string) {
  await requireAdmin();
  const id = idSchema.parse(reviewId);

  try {
    await db
      .update(reviews)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(reviews.id, id));

    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error) {
    console.error("[Admin] restoreReview error:", error);
    return { error: "Failed to restore review" };
  }
}

// ─── Report Moderation ──────────────────────────────────────────

export async function resolveReport(reportId: string) {
  await requireAdmin();
  const id = idSchema.parse(reportId);

  try {
    await db
      .update(reports)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(reports.id, id));

    revalidatePath("/admin/reports");
    return { success: true };
  } catch (error) {
    console.error("[Admin] resolveReport error:", error);
    return { error: "Failed to resolve report" };
  }
}

export async function dismissReport(reportId: string) {
  await requireAdmin();
  const id = idSchema.parse(reportId);

  try {
    await db
      .update(reports)
      .set({ status: "dismissed", resolvedAt: new Date() })
      .where(eq(reports.id, id));

    revalidatePath("/admin/reports");
    return { success: true };
  } catch (error) {
    console.error("[Admin] dismissReport error:", error);
    return { error: "Failed to dismiss report" };
  }
}

// ─── User Moderation ────────────────────────────────────────────

export async function setUserRole(userId: string, role: "user" | "moderator" | "admin") {
  await requireAdmin();
  const id = idSchema.parse(userId);
  const validRole = roleSchema.parse(role);

  try {
    await db
      .update(users)
      .set({ role: validRole, updatedAt: new Date() })
      .where(eq(users.id, id));

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[Admin] setUserRole error:", error);
    return { error: "Failed to update user role" };
  }
}

// ─── Submission Review Pipeline / Dedup ─────────────────────────

export async function getPendingGroupsWithDuplicates() {
  await requireAdmin();

  try {
    const pendingGroups = await db
      .select()
      .from(signalGroups)
      .where(eq(signalGroups.status, "pending"));

    const results = await Promise.all(
      pendingGroups.map(async (group) => {
        // Find potential duplicates among approved groups (fuzzy match on name + handle)
        const conditions = [];
        if (group.name) {
          conditions.push(ilike(signalGroups.name, `%${group.name}%`));
        }
        if (group.platformHandle) {
          conditions.push(
            ilike(signalGroups.platformHandle, `%${group.platformHandle}%`)
          );
        }

        let potentialDuplicates: typeof pendingGroups = [];
        if (conditions.length > 0) {
          potentialDuplicates = await db
            .select()
            .from(signalGroups)
            .where(
              and(
                eq(signalGroups.status, "approved"),
                ne(signalGroups.id, group.id),
                or(...conditions)
              )
            );
        }

        return { group, potentialDuplicates };
      })
    );

    return results;
  } catch (error) {
    console.error("[Admin] getPendingGroupsWithDuplicates error:", error);
    return [];
  }
}

export async function mergeGroup(sourceId: string, targetId: string) {
  await requireAdmin();
  const srcId = idSchema.parse(sourceId);
  const tgtId = idSchema.parse(targetId);

  try {
    // Move all reviews from source group to target group
    await db
      .update(reviews)
      .set({ groupId: tgtId, updatedAt: new Date() })
      .where(eq(reviews.groupId, srcId));

    // Move all tradeRatings from source to target
    await db
      .update(tradeRatings)
      .set({ groupId: tgtId })
      .where(eq(tradeRatings.groupId, srcId));

    // Move all twitterMentions from source to target
    await db
      .update(twitterMentions)
      .set({ groupId: tgtId })
      .where(eq(twitterMentions.groupId, srcId));

    // Move all scamFlags from source to target
    await db
      .update(scamFlags)
      .set({ groupId: tgtId })
      .where(eq(scamFlags.groupId, srcId));

    // Delete the source group
    await db.delete(signalGroups).where(eq(signalGroups.id, srcId));

    // Recalculate target group's avg_score and review_count
    const [stats] = await db
      .select({
        avgScore: sql<string>`COALESCE(AVG(overall_rating::numeric), 0)::numeric(3,1)`,
        reviewCount: sql<number>`COUNT(*)::int`,
      })
      .from(reviews)
      .where(
        and(eq(reviews.groupId, tgtId), eq(reviews.status, "published"))
      );

    await db
      .update(signalGroups)
      .set({
        avgScore: stats.avgScore,
        reviewCount: stats.reviewCount,
        updatedAt: new Date(),
      })
      .where(eq(signalGroups.id, tgtId));

    // Recalculate tier for target group
    await calculateGroupTier(tgtId);

    revalidatePath("/admin/groups");
    revalidatePath("/groups");
    revalidatePath("/leaderboard");
    return { success: true };
  } catch (error) {
    console.error("[Admin] mergeGroup error:", error);
    return { error: "Failed to merge groups" };
  }
}
