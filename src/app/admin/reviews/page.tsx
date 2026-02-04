export const dynamic = "force-dynamic";

import { db } from "@/db";
import { reviews, users, signalGroups } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { AdminReviewActions } from "@/components/admin/review-actions";

export default async function AdminReviewsPage() {
  const allReviews = await db
    .select({
      id: reviews.id,
      title: reviews.title,
      overallRating: reviews.overallRating,
      status: reviews.status,
      createdAt: reviews.createdAt,
      userName: users.name,
      groupName: signalGroups.name,
      groupSlug: signalGroups.slug,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .leftJoin(signalGroups, eq(reviews.groupId, signalGroups.id))
    .orderBy(desc(reviews.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl tracking-wider text-foreground">
        Manage <span className="text-tertiary">Reviews</span>
      </h1>

      <div className="space-y-2">
        {allReviews.map((review) => (
          <div
            key={review.id}
            className="bg-surface-1 border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-heading text-xs tracking-wider text-foreground">
                  {review.groupName}
                </span>
                <span className="text-xs text-primary font-heading">
                  {review.overallRating}/5
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-heading border ${
                    review.status === "published"
                      ? "border-primary/30 text-primary"
                      : review.status === "flagged"
                        ? "border-tier-s/30 text-tier-s"
                        : "border-destructive/30 text-destructive"
                  }`}
                >
                  {review.status.toUpperCase()}
                </span>
              </div>
              {review.title && (
                <p className="text-xs text-muted-foreground truncate">
                  {review.title}
                </p>
              )}
              <p className="text-xs text-muted-foreground/50 font-mono">
                by {review.userName || "Anonymous"} &bull;{" "}
                {new Date(review.createdAt).toLocaleDateString()}
              </p>
            </div>
            <AdminReviewActions reviewId={review.id} status={review.status} />
          </div>
        ))}

        {allReviews.length === 0 && (
          <p className="text-muted-foreground font-mono text-sm text-center py-8">
            No reviews found
          </p>
        )}
      </div>
    </div>
  );
}
