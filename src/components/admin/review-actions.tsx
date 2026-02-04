"use client";

import { flagReview, removeReview, restoreReview } from "@/actions/admin";

export function AdminReviewActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  return (
    <div className="flex gap-2">
      {status === "published" && (
        <>
          <button
            onClick={() => flagReview(reviewId)}
            className="px-3 py-1 text-[10px] font-heading tracking-wider border border-tier-s/30 text-tier-s hover:bg-tier-s/10 transition-colors"
          >
            Flag
          </button>
          <button
            onClick={() => removeReview(reviewId)}
            className="px-3 py-1 text-[10px] font-heading tracking-wider border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
          >
            Remove
          </button>
        </>
      )}
      {status === "flagged" && (
        <>
          <button
            onClick={() => restoreReview(reviewId)}
            className="px-3 py-1 text-[10px] font-heading tracking-wider border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            Restore
          </button>
          <button
            onClick={() => removeReview(reviewId)}
            className="px-3 py-1 text-[10px] font-heading tracking-wider border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
          >
            Remove
          </button>
        </>
      )}
      {status === "removed" && (
        <button
          onClick={() => restoreReview(reviewId)}
          className="px-3 py-1 text-[10px] font-heading tracking-wider border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
        >
          Restore
        </button>
      )}
    </div>
  );
}
