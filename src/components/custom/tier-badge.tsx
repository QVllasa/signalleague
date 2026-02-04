import * as React from "react";
import { cn } from "@/lib/utils";

type Tier = "S" | "A" | "B" | "C" | "D" | "F" | "UNRANKED";
type TierSize = "sm" | "md" | "lg";

interface TierBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  tier: Tier;
  size?: TierSize;
}

const tierConfig: Record<
  Tier,
  { label: string; colorClass: string; glowClass: string; animate?: boolean }
> = {
  S: {
    label: "S",
    colorClass:
      "bg-tier-s/15 text-tier-s border-tier-s/50",
    glowClass:
      "[box-shadow:0_0_8px_color-mix(in_srgb,var(--color-tier-s)_50%,transparent),0_0_20px_color-mix(in_srgb,var(--color-tier-s)_20%,transparent)]",
    animate: true,
  },
  A: {
    label: "A",
    colorClass:
      "bg-tier-a/15 text-tier-a border-tier-a/40",
    glowClass:
      "[box-shadow:0_0_6px_color-mix(in_srgb,var(--color-tier-a)_40%,transparent),0_0_15px_color-mix(in_srgb,var(--color-tier-a)_15%,transparent)]",
  },
  B: {
    label: "B",
    colorClass:
      "bg-tier-b/15 text-tier-b border-tier-b/35",
    glowClass:
      "[box-shadow:0_0_5px_color-mix(in_srgb,var(--color-tier-b)_35%,transparent),0_0_12px_color-mix(in_srgb,var(--color-tier-b)_12%,transparent)]",
  },
  C: {
    label: "C",
    colorClass:
      "bg-tier-c/15 text-tier-c border-tier-c/30",
    glowClass:
      "[box-shadow:0_0_4px_color-mix(in_srgb,var(--color-tier-c)_25%,transparent)]",
  },
  D: {
    label: "D",
    colorClass:
      "bg-tier-d/15 text-tier-d border-tier-d/30",
    glowClass:
      "[box-shadow:0_0_3px_color-mix(in_srgb,var(--color-tier-d)_20%,transparent)]",
  },
  F: {
    label: "F",
    colorClass:
      "bg-tier-f/15 text-tier-f border-tier-f/30",
    glowClass:
      "[box-shadow:0_0_3px_color-mix(in_srgb,var(--color-tier-f)_20%,transparent)]",
  },
  UNRANKED: {
    label: "?",
    colorClass:
      "bg-tier-unranked/10 text-tier-unranked border-tier-unranked/20",
    glowClass: "",
  },
};

const sizeConfig: Record<
  TierSize,
  { container: string; font: string }
> = {
  sm: {
    container: "h-6 w-6",
    font: "text-[10px]",
  },
  md: {
    container: "h-9 w-9",
    font: "text-sm",
  },
  lg: {
    container: "h-12 w-12",
    font: "text-lg",
  },
};

const TierBadge = React.forwardRef<HTMLDivElement, TierBadgeProps>(
  ({ tier, size = "md", className, ...props }, ref) => {
    const config = tierConfig[tier];
    const sizeStyles = sizeConfig[size];

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center",
          "chamfer-sm border font-heading uppercase tracking-wider",
          "transition-all duration-300",
          sizeStyles.container,
          sizeStyles.font,
          config.colorClass,
          config.glowClass,
          config.animate && "animate-glow-pulse",
          className
        )}
        title={`Tier ${tier === "UNRANKED" ? "Unranked" : tier}`}
        {...props}
      >
        {config.label}
      </div>
    );
  }
);
TierBadge.displayName = "TierBadge";

export { TierBadge };
export type { Tier, TierSize, TierBadgeProps };
