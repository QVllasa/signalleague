import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center",
    "chamfer-sm px-2.5 py-0.5",
    "font-heading text-[10px] uppercase tracking-widest",
    "transition-colors duration-200",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary border border-primary/30",
        secondary: "bg-secondary/15 text-secondary border border-secondary/30",
        outline: "bg-transparent text-foreground border border-border",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/30",
        "tier-s": [
          "bg-tier-s/15 text-tier-s border border-tier-s/40",
          "[box-shadow:0_0_6px_color-mix(in_srgb,var(--color-tier-s)_40%,transparent)]",
        ],
        "tier-a": [
          "bg-tier-a/15 text-tier-a border border-tier-a/30",
          "[box-shadow:0_0_4px_color-mix(in_srgb,var(--color-tier-a)_30%,transparent)]",
        ],
        "tier-b": [
          "bg-tier-b/15 text-tier-b border border-tier-b/30",
          "[box-shadow:0_0_4px_color-mix(in_srgb,var(--color-tier-b)_25%,transparent)]",
        ],
        "tier-c": "bg-tier-c/15 text-tier-c border border-tier-c/30",
        "tier-d": "bg-tier-d/15 text-tier-d border border-tier-d/30",
        "tier-f": "bg-tier-f/15 text-tier-f border border-tier-f/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
