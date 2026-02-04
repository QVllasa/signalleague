export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { db } from "@/db";
import { signalGroups } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://signalleague.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/groups`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  // Dynamic group pages
  const groups = await db
    .select({ slug: signalGroups.slug, updatedAt: signalGroups.updatedAt })
    .from(signalGroups)
    .where(eq(signalGroups.status, "approved"));

  const groupPages: MetadataRoute.Sitemap = groups.map((group) => ({
    url: `${baseUrl}/groups/${group.slug}`,
    lastModified: group.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...groupPages];
}
