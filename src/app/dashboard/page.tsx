export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/custom/star-rating";
import { db } from "@/db";
import { reviews, signalGroups, bookmarks, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user data
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Fetch user reviews
  const userReviews = await db
    .select({
      id: reviews.id,
      overallRating: reviews.overallRating,
      title: reviews.title,
      createdAt: reviews.createdAt,
      helpfulCount: reviews.helpfulCount,
      groupName: signalGroups.name,
      groupSlug: signalGroups.slug,
    })
    .from(reviews)
    .leftJoin(signalGroups, eq(reviews.groupId, signalGroups.id))
    .where(eq(reviews.userId, session.user.id))
    .orderBy(desc(reviews.createdAt))
    .limit(10);

  // Fetch bookmarks
  const userBookmarks = await db
    .select({
      groupId: bookmarks.groupId,
      createdAt: bookmarks.createdAt,
      groupName: signalGroups.name,
      groupSlug: signalGroups.slug,
      avgScore: signalGroups.avgScore,
    })
    .from(bookmarks)
    .leftJoin(signalGroups, eq(bookmarks.groupId, signalGroups.id))
    .where(eq(bookmarks.userId, session.user.id))
    .orderBy(desc(bookmarks.createdAt))
    .limit(10);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* User Info */}
          <div className="bg-surface-1 border border-border p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-surface-3 flex items-center justify-center font-heading text-2xl text-primary">
                {user?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <h1 className="font-heading text-xl tracking-wider text-foreground">
                  {user?.name || "Anonymous"}
                </h1>
                <p className="text-sm text-muted-foreground font-mono">
                  {user?.email}
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    Reputation: <span className="text-primary">{user?.reputationScore || 0}</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    Reviews: <span className="text-primary">{userReviews.length}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Reviews */}
            <div className="space-y-4">
              <h2 className="font-heading text-sm tracking-wider text-foreground">
                Your Reviews
              </h2>
              {userReviews.length === 0 ? (
                <div className="bg-surface-1 border border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground font-mono mb-3">
                    You haven&apos;t written any reviews yet
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/groups">Browse Groups</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {userReviews.map((review) => (
                    <Link
                      key={review.id}
                      href={`/groups/${review.groupSlug}`}
                      className="block bg-surface-1 border border-border p-4 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-heading text-xs tracking-wider text-foreground truncate">
                            {review.groupName}
                          </p>
                          {review.title && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {review.title}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/50 mt-1 font-mono">
                            {new Date(review.createdAt).toLocaleDateString()} &bull;{" "}
                            {review.helpfulCount} helpful
                          </p>
                        </div>
                        <StarRating
                          value={parseFloat(review.overallRating)}
                          size="sm"
                          readonly
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Bookmarks */}
            <div className="space-y-4">
              <h2 className="font-heading text-sm tracking-wider text-foreground">
                Bookmarked Groups
              </h2>
              {userBookmarks.length === 0 ? (
                <div className="bg-surface-1 border border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground font-mono mb-3">
                    No bookmarks yet
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/groups">Discover Groups</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {userBookmarks.map((bm) => (
                    <Link
                      key={bm.groupId}
                      href={`/groups/${bm.groupSlug}`}
                      className="flex items-center justify-between bg-surface-1 border border-border p-4 hover:border-primary/30 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-heading text-xs tracking-wider text-foreground truncate">
                          {bm.groupName}
                        </p>
                        <p className="text-xs text-muted-foreground/50 font-mono mt-0.5">
                          Bookmarked {new Date(bm.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-sm font-heading text-primary">
                        {bm.avgScore ? parseFloat(bm.avgScore).toFixed(1) : "—"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
