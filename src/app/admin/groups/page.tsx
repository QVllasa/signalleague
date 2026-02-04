export const dynamic = "force-dynamic";

import { db } from "@/db";
import { signalGroups } from "@/db/schema";
import { desc } from "drizzle-orm";
import { AdminGroupActions } from "@/components/admin/group-actions";

export default async function AdminGroupsPage() {
  const groups = await db
    .select()
    .from(signalGroups)
    .orderBy(desc(signalGroups.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl tracking-wider text-foreground">
        Manage <span className="text-primary">Groups</span>
      </h1>

      <div className="space-y-2">
        {groups.map((group) => (
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
                      : group.status === "pending"
                        ? "border-tier-s/30 text-tier-s bg-tier-s/10"
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
                {new Date(group.createdAt).toLocaleDateString()}
              </p>
            </div>
            <AdminGroupActions groupId={group.id} status={group.status} />
          </div>
        ))}

        {groups.length === 0 && (
          <p className="text-muted-foreground font-mono text-sm text-center py-8">
            No groups found
          </p>
        )}
      </div>
    </div>
  );
}
