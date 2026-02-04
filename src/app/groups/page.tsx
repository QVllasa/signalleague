export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getGroups } from "@/actions/groups";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SearchParams {
  search?: string;
  platform?: string;
  pricing?: string;
  sort?: string;
  page?: string;
}

async function GroupsGrid({ searchParams }: { searchParams: SearchParams }) {
  const { groups, pagination } = await getGroups({
    search: searchParams.search,
    platform: searchParams.platform,
    pricingModel: searchParams.pricing,
    sortBy: searchParams.sort || "avgScore",
    page: searchParams.page ? parseInt(searchParams.page) : 1,
  });

  if (groups.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground font-mono">No signal groups found</p>
        <Button variant="outline" asChild>
          <Link href="/groups/submit">Submit the first one</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            name={group.name}
            slug={group.slug}
            description={group.description}
            platform={group.platform}
            pricingModel={group.pricingModel}
            avgScore={group.avgScore}
            reviewCount={group.reviewCount}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (p) => (
              <Link
                key={p}
                href={{
                  pathname: "/groups",
                  query: { ...searchParams, page: p.toString() },
                }}
                className={`h-8 w-8 flex items-center justify-center font-mono text-sm border transition-colors ${
                  p === pagination.page
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {p}
              </Link>
            )
          )}
        </div>
      )}
    </>
  );
}

export default async function GroupsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl tracking-wider text-foreground">
                Signal <span className="text-primary">Groups</span>
              </h1>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                Browse and discover crypto signal communities
              </p>
            </div>
            <Button asChild>
              <Link href="/groups/submit">Submit Group</Link>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {/* Platform filter */}
            {["all", "twitter", "discord", "telegram"].map((p) => (
              <Link
                key={p}
                href={{
                  pathname: "/groups",
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
                {p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
              </Link>
            ))}

            <span className="text-border">|</span>

            {/* Pricing filter */}
            {["all", "free", "paid", "freemium"].map((p) => (
              <Link
                key={p}
                href={{
                  pathname: "/groups",
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
                {p === "all" ? "All Pricing" : p.charAt(0).toUpperCase() + p.slice(1)}
              </Link>
            ))}

            <span className="text-border">|</span>

            {/* Sort */}
            {[
              { value: "avgScore", label: "Top Rated" },
              { value: "reviewCount", label: "Most Reviews" },
              { value: "newest", label: "Newest" },
            ].map((s) => (
              <Link
                key={s.value}
                href={{
                  pathname: "/groups",
                  query: {
                    ...searchParams,
                    sort: s.value,
                    page: undefined,
                  },
                }}
                className={`px-3 py-1.5 font-mono text-xs border transition-colors ${
                  searchParams.sort === s.value ||
                  (!searchParams.sort && s.value === "avgScore")
                    ? "border-tertiary text-tertiary bg-tertiary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-tertiary/30"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>

          {/* Grid */}
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-1 border border-border p-5 h-48 animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <GroupsGrid searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
