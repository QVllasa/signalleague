import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────────

type Severity = "low" | "medium" | "high" | "critical";

interface ScamWarningProps {
  flags: Array<{
    flag: string;
    description: string;
    severity: Severity;
  }>;
}

// ─── Severity Config ────────────────────────────────────────────────────────────

const severityConfig: Record<
  Severity,
  { label: string; containerClass: string; badgeClass: string }
> = {
  low: {
    label: "LOW",
    containerClass: "text-muted-foreground bg-muted/10 border-muted-foreground/30",
    badgeClass: "bg-muted-foreground/20 text-muted-foreground",
  },
  medium: {
    label: "MEDIUM",
    containerClass: "text-tier-c bg-tier-c/10 border-tier-c/30",
    badgeClass: "bg-tier-c/20 text-tier-c",
  },
  high: {
    label: "HIGH",
    containerClass: "text-destructive bg-destructive/10 border-destructive/30",
    badgeClass: "bg-destructive/20 text-destructive",
  },
  critical: {
    label: "CRITICAL",
    containerClass: "text-destructive bg-destructive/20 border-destructive/50",
    badgeClass: "bg-destructive/30 text-destructive",
  },
};

// ─── Flag Icons ─────────────────────────────────────────────────────────────────

const flagIcons: Record<string, string> = {
  only_shows_winners: "\u{1F4C8}",
  account_too_new: "\u{1F195}",
  multiple_scam_reports: "\u{1F6A8}",
  high_price: "\u{1F4B0}",
  negative_sentiment: "\u{1F4C9}",
};

const DEFAULT_FLAG_ICON = "\u{1F6A9}";

function getFlagIcon(flag: string): string {
  return flagIcons[flag] ?? DEFAULT_FLAG_ICON;
}

// ─── Severity Ordering ──────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function getMaxSeverity(flags: ScamWarningProps["flags"]): Severity {
  return flags.reduce<Severity>(
    (max, f) =>
      SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[max] ? f.severity : max,
    "low",
  );
}

// ─── Component ──────────────────────────────────────────────────────────────────

function ScamWarning({ flags }: ScamWarningProps) {
  if (flags.length === 0) return null;

  const maxSev = getMaxSeverity(flags);
  const config = severityConfig[maxSev];

  return (
    <div
      className={cn(
        "border p-4 font-mono text-xs",
        "chamfer-sm",
        config.containerClass,
      )}
      role="alert"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-heading text-sm uppercase tracking-wider">
          RED FLAGS DETECTED
        </span>
        <span
          className={cn(
            "chamfer-sm px-2 py-0.5 font-heading text-[10px] uppercase tracking-widest",
            config.badgeClass,
          )}
        >
          Risk: {config.label}
        </span>
      </div>

      {/* Flag List */}
      <ul className="space-y-2">
        {flags.map((f, i) => (
          <li key={`${f.flag}-${i}`} className="flex items-start gap-2">
            <span className="mt-px shrink-0" aria-hidden="true">
              {getFlagIcon(f.flag)}
            </span>
            <span className="leading-relaxed">{f.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
ScamWarning.displayName = "ScamWarning";

export { ScamWarning };
export type { ScamWarningProps, Severity };
