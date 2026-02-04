export const dynamic = "force-dynamic";

import { db } from "@/db";
import { waitlist } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";

export default async function AdminWaitlistPage() {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      converted: sql<number>`count(*) filter (where status = 'converted')::int`,
    })
    .from(waitlist);

  const entries = await db
    .select()
    .from(waitlist)
    .orderBy(desc(waitlist.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl tracking-wider text-foreground">
        <span className="text-secondary">Waitlist</span> Management
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-1 border border-border p-4">
          <p className="font-heading text-2xl text-secondary">{stats.total}</p>
          <p className="text-xs text-muted-foreground font-mono">Total</p>
        </div>
        <div className="bg-surface-1 border border-border p-4">
          <p className="font-heading text-2xl text-primary">{stats.active}</p>
          <p className="text-xs text-muted-foreground font-mono">Active</p>
        </div>
        <div className="bg-surface-1 border border-border p-4">
          <p className="font-heading text-2xl text-tertiary">{stats.converted}</p>
          <p className="text-xs text-muted-foreground font-mono">Converted</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                #
              </th>
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Email
              </th>
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Code
              </th>
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Referred By
              </th>
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Status
              </th>
              <th className="text-left text-xs font-mono text-muted-foreground uppercase tracking-wider py-2 px-3">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-border/50 hover:bg-surface-1 transition-colors"
              >
                <td className="py-2 px-3 text-xs text-muted-foreground font-mono">
                  {entry.position || "—"}
                </td>
                <td className="py-2 px-3 text-xs text-foreground font-mono">
                  {entry.email}
                </td>
                <td className="py-2 px-3 text-xs text-primary font-mono">
                  {entry.referralCode}
                </td>
                <td className="py-2 px-3 text-xs text-muted-foreground font-mono">
                  {entry.referredBy || "—"}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`text-[10px] font-heading tracking-wider ${
                      entry.status === "active"
                        ? "text-primary"
                        : entry.status === "converted"
                          ? "text-tertiary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {entry.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 px-3 text-xs text-muted-foreground font-mono">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
