import { MeiliSearch } from "meilisearch";

export const meilisearch = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_API_KEY || "signalleague-master-key",
});

export const INDEXES = {
  SIGNAL_GROUPS: "signal_groups",
} as const;

export async function initMeiliSearch() {
  const index = meilisearch.index(INDEXES.SIGNAL_GROUPS);

  await index.updateSettings({
    searchableAttributes: ["name", "description", "tags", "platformHandle"],
    filterableAttributes: [
      "platform",
      "assetClass",
      "tier",
      "pricingModel",
      "status",
      "avgScore",
    ],
    sortableAttributes: ["avgScore", "reviewCount", "createdAt", "name"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
  });
}
