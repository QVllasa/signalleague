"use client";

import { useTransition, useState } from "react";
import { updateBotConfig } from "@/actions/bot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULTS: Record<string, string> = {
  monitor_keywords: "PnL, signal group, join my VIP, free signals, copy my trades",
  watchlist_accounts: "",
  max_posts_per_hour: "3",
  posting_hours_start: "8",
  posting_hours_end: "22",
  tone_preset: "investigative",
  blocked_accounts: "",
};

export function BotConfigForm({ config }: { config: Record<string, string> }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function getValue(key: string) {
    return config[key] ?? DEFAULTS[key] ?? "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);

    const formData = new FormData(e.currentTarget);
    const entries: [string, string][] = [
      ["monitor_keywords", formData.get("monitor_keywords") as string],
      ["watchlist_accounts", formData.get("watchlist_accounts") as string],
      ["max_posts_per_hour", formData.get("max_posts_per_hour") as string],
      ["posting_hours_start", formData.get("posting_hours_start") as string],
      ["posting_hours_end", formData.get("posting_hours_end") as string],
      ["tone_preset", formData.get("tone_preset") as string],
      ["blocked_accounts", formData.get("blocked_accounts") as string],
    ];

    startTransition(async () => {
      for (const [key, value] of entries) {
        await updateBotConfig(key, value);
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {saved && (
        <div className="bg-primary/10 border border-primary/30 p-4 text-primary text-sm font-mono">
          Configuration saved successfully.
        </div>
      )}

      {/* Monitor Keywords */}
      <div className="space-y-2">
        <label className="font-heading text-xs tracking-wider text-foreground">
          Monitor Keywords
        </label>
        <textarea
          name="monitor_keywords"
          rows={3}
          defaultValue={getValue("monitor_keywords")}
          placeholder="PnL, signal group, join my VIP, free signals, copy my trades"
          className="flex w-full bg-surface-2 border border-border px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:border-primary focus:[box-shadow:0_0_8px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]"
        />
        <p className="text-[10px] text-muted-foreground font-mono">
          Comma-separated keywords to monitor on Twitter.
        </p>
      </div>

      {/* Watchlist Accounts */}
      <div className="space-y-2">
        <label className="font-heading text-xs tracking-wider text-foreground">
          Watchlist Accounts
        </label>
        <textarea
          name="watchlist_accounts"
          rows={3}
          defaultValue={getValue("watchlist_accounts")}
          placeholder="@handle1, @handle2, @handle3"
          className="flex w-full bg-surface-2 border border-border px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:border-primary focus:[box-shadow:0_0_8px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]"
        />
        <p className="text-[10px] text-muted-foreground font-mono">
          Twitter handles to actively watch for engagement opportunities.
        </p>
      </div>

      {/* Max Posts Per Hour */}
      <div className="space-y-2">
        <label className="font-heading text-xs tracking-wider text-foreground">
          Max Posts Per Hour
        </label>
        <Input
          name="max_posts_per_hour"
          type="number"
          min={0}
          max={60}
          defaultValue={getValue("max_posts_per_hour")}
          placeholder="3"
        />
        <p className="text-[10px] text-muted-foreground font-mono">
          Maximum number of automated posts per hour.
        </p>
      </div>

      {/* Posting Hours */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="font-heading text-xs tracking-wider text-foreground">
            Posting Hours Start (UTC)
          </label>
          <Input
            name="posting_hours_start"
            type="number"
            min={0}
            max={23}
            defaultValue={getValue("posting_hours_start")}
            placeholder="8"
          />
        </div>
        <div className="space-y-2">
          <label className="font-heading text-xs tracking-wider text-foreground">
            Posting Hours End (UTC)
          </label>
          <Input
            name="posting_hours_end"
            type="number"
            min={0}
            max={23}
            defaultValue={getValue("posting_hours_end")}
            placeholder="22"
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground font-mono -mt-4">
        Bot will only post between these hours (UTC).
      </p>

      {/* Tone Preset */}
      <div className="space-y-2">
        <label className="font-heading text-xs tracking-wider text-foreground">
          Tone Preset
        </label>
        <select
          name="tone_preset"
          defaultValue={getValue("tone_preset")}
          className="flex h-10 w-full bg-surface-2 border border-border px-3 py-2 font-mono text-sm text-foreground transition-all duration-200 focus:outline-none focus:border-primary"
        >
          <option value="investigative">Investigative</option>
          <option value="provocative">Provocative</option>
          <option value="neutral">Neutral</option>
        </select>
        <p className="text-[10px] text-muted-foreground font-mono">
          Controls the tone used for generated posts.
        </p>
      </div>

      {/* Blocked Accounts */}
      <div className="space-y-2">
        <label className="font-heading text-xs tracking-wider text-foreground">
          Blocked Accounts
        </label>
        <textarea
          name="blocked_accounts"
          rows={3}
          defaultValue={getValue("blocked_accounts")}
          placeholder="@blocked1, @blocked2"
          className="flex w-full bg-surface-2 border border-border px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:border-primary focus:[box-shadow:0_0_8px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]"
        />
        <p className="text-[10px] text-muted-foreground font-mono">
          Twitter handles to ignore. Will not engage or respond to these accounts.
        </p>
      </div>

      <Button type="submit" variant="glitch" size="default" disabled={isPending}>
        {isPending ? "Saving..." : "Save Configuration"}
      </Button>
    </form>
  );
}
