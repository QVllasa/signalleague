"use server";

import { db } from "@/db";
import { signalGroups, reviews, reports, users, waitlist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { syncGroupToSearch, removeGroupFromSearch } from "@/lib/sync-search";
import { calculateGroupTier } from "@/lib/ranking";

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

  await db
    .update(signalGroups)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(signalGroups.id, groupId));

  // Sync to MeiliSearch and calculate initial tier
  await syncGroupToSearch(groupId);
  await calculateGroupTier(groupId);

  revalidatePath("/admin/groups");
  revalidatePath("/groups");
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function rejectGroup(groupId: string) {
  await requireAdmin();

  await db
    .update(signalGroups)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(signalGroups.id, groupId));

  await removeGroupFromSearch(groupId);

  revalidatePath("/admin/groups");
  return { success: true };
}

export async function suspendGroup(groupId: string) {
  await requireAdmin();

  await db
    .update(signalGroups)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(signalGroups.id, groupId));

  await removeGroupFromSearch(groupId);

  revalidatePath("/admin/groups");
  revalidatePath("/groups");
  revalidatePath("/leaderboard");
  return { success: true };
}

// ─── Review Moderation ──────────────────────────────────────────

export async function flagReview(reviewId: string) {
  await requireAdmin();

  await db
    .update(reviews)
    .set({ status: "flagged", updatedAt: new Date() })
    .where(eq(reviews.id, reviewId));

  revalidatePath("/admin/reviews");
  return { success: true };
}

export async function removeReview(reviewId: string) {
  await requireAdmin();

  await db
    .update(reviews)
    .set({ status: "removed", updatedAt: new Date() })
    .where(eq(reviews.id, reviewId));

  revalidatePath("/admin/reviews");
  return { success: true };
}

export async function restoreReview(reviewId: string) {
  await requireAdmin();

  await db
    .update(reviews)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(reviews.id, reviewId));

  revalidatePath("/admin/reviews");
  return { success: true };
}

// ─── Report Moderation ──────────────────────────────────────────

export async function resolveReport(reportId: string) {
  await requireAdmin();

  await db
    .update(reports)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(reports.id, reportId));

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function dismissReport(reportId: string) {
  await requireAdmin();

  await db
    .update(reports)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(eq(reports.id, reportId));

  revalidatePath("/admin/reports");
  return { success: true };
}

// ─── User Moderation ────────────────────────────────────────────

export async function setUserRole(userId: string, role: "user" | "moderator" | "admin") {
  await requireAdmin();

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}
