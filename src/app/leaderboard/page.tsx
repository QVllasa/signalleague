export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { TierBadge } from "@/components/custom/tier-badge";
import { PLATFORM_CONFIG } from "@/types";
import type { Tier, Platform, PricingModel } from "@/types";
import { db } from "@/db";
import { signalGroups, tierRankings } from "@/db/schema";
import { eq, desc, and, ilike } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Browse the top-ranked crypto signal groups. Community-driven tier rankings from S to F.",
};

interface SearchParams {
  search?: string;
  platform?: string;
  pricing?: string;
  tier?: string;
  page?: string;
}

async function getLeaderboardData(searchParams: SearchParams) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Join groups with tier rankings
  const conditions = [eq(signalGroups.status, "approved")];

  if (searchParams.search) {
    conditions.push(ilike(signalGroups.name, `%${searchParams.search}%`));
  }
  if (searchParams.platform && ["twitter", "discord", "telegram"].includes(searchParams.platform)) {
    conditions.push(eq(signalGroups.platform, searchParams.platform as Platform));
  }
  if (searchParams.pricing && ["free", "paid", "freemium"].includes(searchParams.pricing)) {
    conditions.push(eq(signalGroups.pricingModel, searchParams.pricing as PricingModel));
  }

  const rows = await db
    .select({
      id: signalGroups.id,
      name: signalGroups.name,
      slug: signalGroups.slug,
      platform: signalGroups.platform,
      pricingModel: signalGroups.pricingModel,
      avgScore: signalGroups.avgScore,
      reviewCount: signalGroups.reviewCount,
      tier: tierRankings.tier,
      totalScore: tierRankings.totalScore,
    })
    .from(signalGroups)
    .leftJoin(tierRankings, eq(signalGroups.id, tierRankings.groupId))
    .where(and(...conditions))
    .orderBy(desc(tierRankings.totalScore))
    .limit(limit)
    .offset(offset);

  return rows;
}

function LeaderboardRow({
  rank,
  name,
  slug,
  platform,
  pricingModel,
  avgScore,
  reviewCount,
  tier,
  totalScore,
}: {
  rank: number;
  name: string;
  slug: string;
  platform: Platform;
  pricingModel: PricingModel;
  avgScore: string | null;
  reviewCount: number;
  tier: Tier | null;
  totalScore: string | null;
}) {
  const platformInfo = PLATFORM_CONFIG[platform];
  const score = avgScore ? parseFloat(avgScore) : 0;
  const algoScore = totalScore ? parseFloat(totalScore) : 0;

  return (
    <Link
      href={`/groups/${slug}`}
      className="group grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_2fr_1fr_1fr_1fr_auto] items-center gap-3 px-4 py-3 bg-surface-1 border border-border hover:border-primary/30 hover:[box-shadow:0_0_15px_color-mix(in_srgb,var(--color-primary)_5%,transparent)] transition-all"
    >
      {/* Rank */}
      <span className="font-heading text-lg text-muted-foreground text-center">
        {rank}
      </span>

      {/* Name + Platform */}
      <div className="min-w-0">
        <p className="font-heading text-sm tracking-wider text-foreground truncate group-hover:text-primary transition-colors">
          {name}
        </p>
        <p
          className="text-xs font-mono mt-0.5"
          style={{ color: platformInfo.color }}
        >
          {platformInfo.label}
        </p>
      </div>

      {/* Hidden on mobile */}
      <span className="hidden sm:block text-xs text-muted-foreground capitalize font-mono">
        {pricingModel}
      </span>
      <span className="hidden sm:block text-xs text-muted-foreground font-mono text-center">
        {reviewCount}
      </span>
      <span className="hidden sm:block font-heading text-sm text-primary text-center">
        {score > 0 ? score.toFixed(1) : "—"}
      </span>

      {/* Tier */}
      <TierBadge tier={tier ?? "UNRANKED"} size="sm" />
    </Link>
  );
}

export default async function LeaderboardPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const data = await getLeaderboardData(searchParams);
  const page = searchParams.page ? parseInt(searchParams.page) : 1;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="space-y-2 mb-8">
            <h1 className="font-heading text-2xl sm:text-3xl tracking-wider text-foreground">
              <span className="text-primary">Leaderboard</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Top-ranked crypto signal groups by tier score
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["all", "twitter", "discord", "telegram"].map((p) => (
              <Link
                key={p}
                href={{
                  pathname: "/leaderboard",
                  query: {
                    ...searchParams,
                    platform: p === "all" ? undefined : p,
                    page: undefined,
                  },
                }}
                className={`px-3 py-1.5 font-mono text-xs border transition-colors ${
                  (p === "all" && !searchParams.platform) ||
                  searchParams.platform === p
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {p === "all"
                  ? "All"
                  : p.charAt(0).toUpperCase() + p.slice(1)}
              </Link>
            ))}
            <span className="text-border">|</span>
            {["all", "free", "paid", "freemium"].map((p) => (
              <Link
                key={p}
                href={{
                  pathname: "/leaderboard",
                  query: {
                    ...searchParams,
                    pricing: p === "all" ? undefined : p,
                    page: undefined,
                  },
                }}
                className={`px-3 py-1.5 font-mono text-xs border transition-colors ${
                  (p === "all" && !searchParams.pricing) ||
                  searchParams.pricing === p
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {p === "all"
                  ? "All Pricing"
                  : p.charAt(0).toUpperCase() + p.slice(1)}
              </Link>
            ))}
          </div>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-[3rem_2fr_1fr_1fr_1fr_auto] items-center gap-3 px-4 py-2 text-xs text-muted-foreground font-mono uppercase tracking-wider border-b border-border mb-2">
            <span className="text-center">#</span>
            <span>Group</span>
            <span>Pricing</span>
            <span className="text-center">Reviews</span>
            <span className="text-center">Score</span>
            <span className="text-center">Tier</span>
          </div>

          {/* Rows */}
          {data.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-mono">
                No ranked groups found
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((row, i) => (
                <LeaderboardRow
                  key={row.id}
                  rank={(page - 1) * 20 + i + 1}
                  name={row.name}
                  slug={row.slug}
                  platform={row.platform}
                  pricingModel={row.pricingModel}
                  avgScore={row.avgScore}
                  reviewCount={row.reviewCount}
                  tier={row.tier as Tier | null}
                  totalScore={row.totalScore}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
