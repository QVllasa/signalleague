"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingSize = "sm" | "md" | "lg";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: StarRatingSize;
  readonly?: boolean;
  className?: string;
}

const sizeConfig: Record<StarRatingSize, { icon: number; gap: string }> = {
  sm: { icon: 14, gap: "gap-0.5" },
  md: { icon: 20, gap: "gap-1" },
  lg: { icon: 28, gap: "gap-1.5" },
};

function StarRating({
  value,
  onChange,
  size = "md",
  readonly = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const isInteractive = !readonly && typeof onChange === "function";
  const displayValue = hoverValue ?? value;
  const { icon: iconSize, gap } = sizeConfig[size];

  return (
    <div
      className={cn("inline-flex items-center", gap, className)}
      onMouseLeave={() => {
        if (isInteractive) setHoverValue(null);
      }}
      role={isInteractive ? "radiogroup" : "img"}
      aria-label={`Rating: ${value} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const starIndex = i + 1;
        const isFilled = starIndex <= displayValue;

        return (
          <button
            key={starIndex}
            type="button"
            disabled={!isInteractive}
            className={cn(
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              isInteractive
                ? "cursor-pointer hover:scale-110"
                : "cursor-default",
              isFilled
                ? "text-primary drop-shadow-[0_0_4px_var(--color-primary)]"
                : "text-muted-foreground/40"
            )}
            onClick={() => {
              if (isInteractive) onChange(starIndex);
            }}
            onMouseEnter={() => {
              if (isInteractive) setHoverValue(starIndex);
            }}
            aria-label={`${starIndex} star${starIndex !== 1 ? "s" : ""}`}
            role={isInteractive ? "radio" : undefined}
            aria-checked={isInteractive ? starIndex === value : undefined}
            tabIndex={isInteractive ? 0 : -1}
          >
            <Star
              size={iconSize}
              fill={isFilled ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
StarRating.displayName = "StarRating";

export { StarRating };
export type { StarRatingProps, StarRatingSize };
