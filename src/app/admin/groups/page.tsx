export const dynamic = "force-dynamic";

import { db } from "@/db";
import { signalGroups } from "@/db/schema";
import { desc, ne } from "drizzle-orm";
import { AdminGroupActions } from "@/components/admin/group-actions";
import { MergeGroupButton } from "@/components/admin/merge-group-button";
import { getPendingGroupsWithDuplicates } from "@/actions/admin";

export default async function AdminGroupsPage() {
  const [pendingWithDupes, allGroups] = await Promise.all([
    getPendingGroupsWithDuplicates(),
    db
      .select()
      .from(signalGroups)
      .where(ne(signalGroups.status, "pending"))
      .orderBy(desc(signalGroups.createdAt))
      .limit(50),
  ]);

  const pendingCount = pendingWithDupes.length;

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-xl tracking-wider text-foreground">
        Manage <span className="text-primary">Groups</span>
      </h1>

      {/* ─── Pending Review Section ────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-sm tracking-wider text-foreground">
            Pending Review
          </h2>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-heading tracking-wider border border-tier-s/30 text-tier-s bg-tier-s/10">
              {pendingCount}
            </span>
          )}
        </div>

        {pendingCount === 0 ? (
          <div className="bg-surface-1 border border-border p-6 text-center">
            <p className="text-muted-foreground font-mono text-sm">
              No pending submissions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingWithDupes.map(({ group, potentialDuplicates }) => (
              <div
                key={group.id}
                className="bg-surface-1 border border-border p-4 space-y-3"
              >
                {/* Group Info Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-xs tracking-wider text-foreground truncate">
                        {group.name}
                      </p>
                      <span className="px-2 py-0.5 text-[10px] font-heading tracking-wider border border-tier-s/30 text-tier-s bg-tier-s/10">
                        PENDING
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {group.platform} &bull; @{group.platformHandle} &bull;{" "}
                      {group.pricingModel} &bull;{" "}
                      {new Date(group.createdAt).toLocaleDateString()}
                    </p>
                    {group.description && (
                      <p className="text-xs text-muted-foreground/70 font-mono mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <AdminGroupActions groupId={group.id} status={group.status} />
                </div>

                {/* Potential Duplicates */}
                {potentialDuplicates.length > 0 && (
                  <div className="border-t border-border/50 pt-3 space-y-2">
                    <p className="text-[10px] font-heading tracking-wider text-tier-s">
                      POTENTIAL DUPLICATES ({potentialDuplicates.length})
                    </p>
                    <div className="space-y-1.5">
                      {potentialDuplicates.map((dup) => (
                        <div
                          key={dup.id}
                          className="bg-surface-0 border border-border/50 px-3 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-[11px] text-foreground truncate">
                                {dup.name}
                              </p>
                              <span className="px-1.5 py-0.5 text-[9px] font-heading tracking-wider border border-primary/30 text-primary bg-primary/10">
                                APPROVED
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {dup.platform} &bull; @{dup.platformHandle} &bull;{" "}
                              {dup.reviewCount} reviews &bull; avg{" "}
                              {dup.avgScore ?? "N/A"}
                            </p>
                          </div>
                          <MergeGroupButton
                            sourceId={group.id}
                            targetId={dup.id}
                            targetName={dup.name}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Separator ─────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ─── Existing Groups Section ───────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-heading text-sm tracking-wider text-foreground">
          All Groups
        </h2>

        <div className="space-y-2">
          {allGroups.map((group) => (
            <div
              key={group.id}
              className="bg-surface-1 border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-xs tracking-wider text-foreground truncate">
                    {group.name}
                  </p>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-heading tracking-wider border ${
                      group.status === "approved"
                        ? "border-primary/30 text-primary bg-primary/10"
                        : group.status === "rejected"
                          ? "border-destructive/30 text-destructive bg-destructive/10"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {group.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {group.platform} &bull; {group.pricingModel} &bull;{" "}
                  {group.reviewCount} reviews &bull;{" "}
                  {new Date(group.createdAt).toLocaleDateString()}
                </p>
              </div>
              <AdminGroupActions groupId={group.id} status={group.status} />
            </div>
          ))}

          {allGroups.length === 0 && (
            <p className="text-muted-foreground font-mono text-sm text-center py-8">
              No groups found
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
