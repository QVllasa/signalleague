"use client";

import { useState, useTransition } from "react";
import { mergeGroup } from "@/actions/admin";

interface MergeGroupButtonProps {
  /** Pending group that gets merged away (deleted after the merge). */
  sourceId: string;
  /** Approved group that receives reviews, trade ratings, mentions and scam flags. */
  targetId: string;
  targetName: string;
}

/**
 * Merges a pending submission into an existing approved group via the
 * `mergeGroup` server action. The source group is deleted afterwards, so the
 * admin has to confirm the action first.
 */
export function MergeGroupButton({
  sourceId,
  targetId,
  targetName,
}: MergeGroupButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleMerge() {
    const confirmed = window.confirm(
      `Merge this submission into "${targetName}"? All reviews, trade ratings, mentions and scam flags move to "${targetName}" and the pending submission is deleted.`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await mergeGroup(sourceId, targetId);
        if ("error" in result && result.error) {
          setError(result.error);
        }
      } catch {
        // requireAdmin() throws instead of returning an error object
        setError("Merge failed (not authorized?)");
      }
    });
  }

  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      <button
        type="button"
        onClick={handleMerge}
        disabled={isPending}
        className="px-3 py-1 text-[10px] font-heading tracking-wider border border-tier-s/30 text-tier-s hover:bg-tier-s/10 transition-colors disabled:opacity-50"
      >
        {isPending ? "Merging..." : "Merge into this"}
      </button>
      {error && (
        <p role="alert" className="text-[10px] font-mono text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
