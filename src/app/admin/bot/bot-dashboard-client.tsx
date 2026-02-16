"use client";

import { useActionState, useTransition } from "react";
import { updateBotConfig, skipQueuedPost, manualPost } from "@/actions/bot";
import { Button } from "@/components/ui/button";

type ManualPostState = { error?: string; success?: boolean } | null;

function manualPostAction(_prev: ManualPostState, formData: FormData) {
  const content = formData.get("content") as string;
  return manualPost(content) as Promise<ManualPostState>;
}

type QueueItem = {
  id: string;
  postType: string;
  content: string;
  status: string;
  createdAt: Date;
  postedAt: Date | null;
  errorMessage: string | null;
};

function SkipButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => skipQueuedPost(id))}
      disabled={isPending}
      className="px-2 py-1 text-[10px] font-heading tracking-wider border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors disabled:opacity-50"
    >
      {isPending ? "..." : "SKIP"}
    </button>
  );
}

function KillSwitch({ enabled }: { enabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(() =>
          updateBotConfig("bot_enabled", enabled ? "false" : "true")
        )
      }
      disabled={isPending}
      className={`relative inline-flex h-6 w-11 items-center transition-colors duration-200 border ${
        enabled
          ? "bg-primary/20 border-primary"
          : "bg-surface-2 border-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transition-transform duration-200 ${
          enabled
            ? "translate-x-6 bg-primary"
            : "translate-x-1 bg-muted-foreground"
        }`}
      />
    </button>
  );
}

const statusColors: Record<string, string> = {
  queued: "border-tier-c/30 text-tier-c bg-tier-c/10",
  posted: "border-primary/30 text-primary bg-primary/10",
  failed: "border-destructive/30 text-destructive bg-destructive/10",
  skipped: "border-border text-muted-foreground bg-surface-2",
};

export function BotDashboardClient({
  queue,
  botEnabled,
}: {
  queue: QueueItem[];
  botEnabled: boolean;
}) {
  const [postState, postAction, isPosting] = useActionState(manualPostAction, null);

  return (
    <>
      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="font-heading text-sm tracking-wider text-foreground">
          Quick <span className="text-secondary">Actions</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Manual Post */}
          <div className="bg-surface-1 border border-border p-4 space-y-3">
            <p className="font-heading text-xs tracking-wider text-muted-foreground">
              MANUAL POST
            </p>
            <form action={postAction} className="space-y-3">
              {postState?.error && (
                <p className="text-destructive text-xs font-mono">{postState.error}</p>
              )}
              {postState?.success && (
                <p className="text-primary text-xs font-mono">Queued successfully</p>
              )}
              <textarea
                name="content"
                required
                rows={3}
                placeholder="Enter tweet content..."
                className="flex w-full bg-surface-2 border border-border px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:border-primary focus:[box-shadow:0_0_8px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]"
              />
              <Button type="submit" variant="outline" size="sm" disabled={isPosting}>
                {isPosting ? "Queueing..." : "Queue Post"}
              </Button>
            </form>
          </div>

          {/* Kill Switch */}
          <div className="bg-surface-1 border border-border p-4 space-y-3">
            <p className="font-heading text-xs tracking-wider text-muted-foreground">
              KILL SWITCH
            </p>
            <div className="flex items-center gap-3">
              <KillSwitch enabled={botEnabled} />
              <span
                className={`font-mono text-xs ${
                  botEnabled ? "text-primary" : "text-destructive"
                }`}
              >
                {botEnabled ? "BOT ACTIVE" : "BOT DISABLED"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              Toggle to enable/disable all automated posting.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="font-heading text-sm tracking-wider text-foreground">
          Recent <span className="text-secondary">Activity</span>
        </h2>

        <div className="space-y-2">
          {queue.map((item) => (
            <div
              key={item.id}
              className="bg-surface-1 border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 text-[10px] font-heading tracking-wider border border-border text-muted-foreground bg-surface-2">
                    {item.postType.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-heading tracking-wider border ${
                      statusColors[item.status] ?? "border-border text-muted-foreground"
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-foreground font-mono mt-1.5 truncate max-w-md">
                  {item.content.length > 120
                    ? item.content.slice(0, 120) + "..."
                    : item.content}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {item.errorMessage && (
                    <p className="text-[10px] text-destructive font-mono truncate max-w-xs">
                      {item.errorMessage}
                    </p>
                  )}
                </div>
              </div>
              {item.status === "queued" && <SkipButton id={item.id} />}
            </div>
          ))}

          {queue.length === 0 && (
            <p className="text-muted-foreground font-mono text-sm text-center py-8">
              No queue items found
            </p>
          )}
        </div>
      </div>
    </>
  );
}
