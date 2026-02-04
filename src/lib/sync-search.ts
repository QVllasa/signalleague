import { meilisearch, INDEXES } from "@/lib/meilisearch";
import { db } from "@/db";
import { signalGroups, tierRankings } from "@/db/schema";
import { eq } from "drizzle-orm";

interface SearchDocument {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  platform: string;
  platformHandle: string | null;
  assetClass: string;
  pricingModel: string;
  tier: string;
  avgScore: number | null;
  reviewCount: number;
  status: string;
  createdAt: string;
}

export async function syncGroupToSearch(groupId: string) {
  const [group] = await db
    .select()
    .from(signalGroups)
    .where(eq(signalGroups.id, groupId))
    .limit(1);

  if (!group) return;

  const [ranking] = await db
    .select()
    .from(tierRankings)
    .where(eq(tierRankings.groupId, groupId))
    .limit(1);

  const doc: SearchDocument = {
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    platform: group.platform,
    platformHandle: group.platformHandle,
    assetClass: group.assetClass,
    pricingModel: group.pricingModel,
    tier: ranking?.tier ?? "UNRANKED",
    avgScore: group.avgScore ? parseFloat(group.avgScore) : null,
    reviewCount: group.reviewCount,
    status: group.status,
    createdAt: group.createdAt.toISOString(),
  };

  const index = meilisearch.index(INDEXES.SIGNAL_GROUPS);
  await index.addDocuments([doc]);
}

export async function syncAllGroupsToSearch() {
  const groups = await db.select().from(signalGroups);
  const rankings = await db.select().from(tierRankings);
  const rankingMap = new Map(rankings.map((r) => [r.groupId, r]));

  const docs: SearchDocument[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    platform: group.platform,
    platformHandle: group.platformHandle,
    assetClass: group.assetClass,
    pricingModel: group.pricingModel,
    tier: rankingMap.get(group.id)?.tier ?? "UNRANKED",
    avgScore: group.avgScore ? parseFloat(group.avgScore) : null,
    reviewCount: group.reviewCount,
    status: group.status,
    createdAt: group.createdAt.toISOString(),
  }));

  const index = meilisearch.index(INDEXES.SIGNAL_GROUPS);
  await index.addDocuments(docs);

  return docs.length;
}

export async function removeGroupFromSearch(groupId: string) {
  const index = meilisearch.index(INDEXES.SIGNAL_GROUPS);
  await index.deleteDocument(groupId);
}
