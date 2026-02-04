"use client";

import { resolveReport, dismissReport } from "@/actions/admin";

export function AdminReportActions({ reportId }: { reportId: string }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => resolveReport(reportId)}
        className="px-3 py-1 text-[10px] font-heading tracking-wider border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
      >
        Resolve
      </button>
      <button
        onClick={() => dismissReport(reportId)}
        className="px-3 py-1 text-[10px] font-heading tracking-wider border border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}
