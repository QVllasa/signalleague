"use server";

import { db } from "@/db";
import { botQueue, botConfig } from "@/db/schema";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

// ─── Bot Stats ──────────────────────────────────────────────────

export async function getBotStats() {
  await requireAdmin();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay());
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const [
    [postsToday],
    [postsThisWeek],
    [queueSize],
    [failedCount],
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(botQueue)
      .where(
        and(
          eq(botQueue.status, "posted"),
          gte(botQueue.postedAt, startOfDay)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(botQueue)
      .where(
        and(
          eq(botQueue.status, "posted"),
          gte(botQueue.postedAt, startOfWeek)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(botQueue)
      .where(eq(botQueue.status, "queued")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(botQueue)
      .where(eq(botQueue.status, "failed")),
  ]);

  return {
    postsToday: postsToday.count,
    postsThisWeek: postsThisWeek.count,
    queueSize: queueSize.count,
    failedCount: failedCount.count,
  };
}

// ─── Bot Queue ──────────────────────────────────────────────────

export async function getBotQueue(limit = 20) {
  await requireAdmin();

  return db
    .select()
    .from(botQueue)
    .orderBy(desc(botQueue.createdAt))
    .limit(limit);
}

// ─── Bot Config ─────────────────────────────────────────────────

export async function getBotConfig() {
  await requireAdmin();

  const rows = await db.select().from(botConfig);
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

export async function updateBotConfig(key: string, value: string) {
  await requireAdmin();

  await db
    .insert(botConfig)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: botConfig.key,
      set: { value, updatedAt: new Date() },
    });

  revalidatePath("/admin/bot");
  revalidatePath("/admin/bot/config");
  return { success: true };
}

// ─── Queue Actions ──────────────────────────────────────────────

export async function skipQueuedPost(id: string) {
  await requireAdmin();

  await db
    .update(botQueue)
    .set({ status: "skipped" })
    .where(eq(botQueue.id, id));

  revalidatePath("/admin/bot");
  return { success: true };
}

export async function manualPost(content: string) {
  await requireAdmin();

  if (!content || content.trim().length === 0) {
    return { error: "Content is required" };
  }

  await db.insert(botQueue).values({
    postType: "general_ct",
    content: content.trim(),
    status: "queued",
  });

  revalidatePath("/admin/bot");
  return { success: true };
}
