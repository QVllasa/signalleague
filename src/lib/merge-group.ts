import { db } from "@/db";
import {
  signalGroups,
  reviews,
  tradeRatings,
  twitterMentions,
  scamFlags,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Führt eine Gruppe (source) in eine andere (target) zusammen: Reviews,
 * Trade-Ratings, Twitter-Mentions und Scam-Flags wandern zu target, source wird
 * gelöscht, avg_score/review_count von target neu berechnet.
 *
 * Alles läuft in EINER Transaktion: Schlägt ein Schritt fehl, wird komplett
 * zurückgerollt und beide Gruppen bleiben unverändert (kein halber Merge).
 *
 * Bewusst kein "use server"-Modul: die Funktion prüft keine Rechte und darf
 * nicht als Server-Action erreichbar sein. Aufrufer ist `mergeGroup` in
 * src/actions/admin.ts (mit requireAdmin).
 */
export async function mergeGroupRecords(srcId: string, tgtId: string) {
  if (srcId === tgtId) {
    throw new Error("Source and target group must differ");
  }

  await db.transaction(async (tx) => {
    // Ziel muss existieren, sonst würden die Kind-Datensätze mit der Quelle
    // gelöscht bzw. an eine nicht existierende Gruppe gehängt.
    const [target] = await tx
      .select({ id: signalGroups.id })
      .from(signalGroups)
      .where(eq(signalGroups.id, tgtId))
      .for("update");
    if (!target) throw new Error("Target group not found");

    await tx
      .update(reviews)
      .set({ groupId: tgtId, updatedAt: new Date() })
      .where(eq(reviews.groupId, srcId));

    await tx
      .update(tradeRatings)
      .set({ groupId: tgtId })
      .where(eq(tradeRatings.groupId, srcId));

    await tx
      .update(twitterMentions)
      .set({ groupId: tgtId })
      .where(eq(twitterMentions.groupId, srcId));

    await tx
      .update(scamFlags)
      .set({ groupId: tgtId })
      .where(eq(scamFlags.groupId, srcId));

    await tx.delete(signalGroups).where(eq(signalGroups.id, srcId));

    const [stats] = await tx
      .select({
        avgScore: sql<string>`COALESCE(AVG(overall_rating::numeric), 0)::numeric(3,1)`,
        reviewCount: sql<number>`COUNT(*)::int`,
      })
      .from(reviews)
      .where(and(eq(reviews.groupId, tgtId), eq(reviews.status, "published")));

    await tx
      .update(signalGroups)
      .set({
        avgScore: stats.avgScore,
        reviewCount: stats.reviewCount,
        updatedAt: new Date(),
      })
      .where(eq(signalGroups.id, tgtId));
  });
}
