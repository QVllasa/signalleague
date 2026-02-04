export const dynamic = "force-dynamic";

import { db } from "@/db";
import { reports, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { AdminReportActions } from "@/components/admin/report-actions";

export default async function AdminReportsPage() {
  const allReports = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      description: reports.description,
      status: reports.status,
      createdAt: reports.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .orderBy(desc(reports.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl tracking-wider text-foreground">
        Manage <span className="text-destructive">Reports</span>
      </h1>

      <div className="space-y-2">
        {allReports.map((report) => (
          <div
            key={report.id}
            className="bg-surface-1 border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading tracking-wider text-foreground uppercase">
                  {report.targetType}
                </span>
                <span className="text-xs font-mono text-destructive">
                  {report.reason.replace("_", " ")}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-heading border ${
                    report.status === "pending"
                      ? "border-tier-s/30 text-tier-s"
                      : report.status === "resolved"
                        ? "border-primary/30 text-primary"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {report.status.toUpperCase()}
                </span>
              </div>
              {report.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {report.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground/50 font-mono">
                by {report.userName || report.userEmail} &bull;{" "}
                {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>
            {report.status === "pending" && (
              <AdminReportActions reportId={report.id} />
            )}
          </div>
        ))}

        {allReports.length === 0 && (
          <p className="text-muted-foreground font-mono text-sm text-center py-8">
            No reports found
          </p>
        )}
      </div>
    </div>
  );
}
