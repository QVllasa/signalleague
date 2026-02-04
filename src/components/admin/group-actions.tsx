"use client";

import { approveGroup, rejectGroup, suspendGroup } from "@/actions/admin";

interface GroupActionsProps {
  groupId: string;
  status: string;
}

export function AdminGroupActions({ groupId, status }: GroupActionsProps) {
  return (
    <div className="flex gap-2">
      {status === "pending" && (
        <>
          <button
            onClick={() => approveGroup(groupId)}
            className="px-3 py-1 text-[10px] font-heading tracking-wider border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => rejectGroup(groupId)}
            className="px-3 py-1 text-[10px] font-heading tracking-wider border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
          >
            Reject
          </button>
        </>
      )}
      {status === "approved" && (
        <button
          onClick={() => suspendGroup(groupId)}
          className="px-3 py-1 text-[10px] font-heading tracking-wider border border-tier-d/30 text-tier-d hover:bg-tier-d/10 transition-colors"
        >
          Suspend
        </button>
      )}
      {(status === "rejected" || status === "suspended") && (
        <button
          onClick={() => approveGroup(groupId)}
          className="px-3 py-1 text-[10px] font-heading tracking-wider border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
        >
          Re-approve
        </button>
      )}
    </div>
  );
}
