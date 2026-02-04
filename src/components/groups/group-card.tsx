import Link from "next/link";
import { TierBadge } from "@/components/custom/tier-badge";
import { PLATFORM_CONFIG, TIER_CONFIG } from "@/types";
import type { Tier, Platform, PricingModel } from "@/types";

interface GroupCardProps {
  name: string;
  slug: string;
  description: string | null;
  platform: Platform;
  pricingModel: PricingModel;
  avgScore: string | null;
  reviewCount: number;
  tier?: Tier;
}

export function GroupCard({
  name,
  slug,
  description,
  platform,
  pricingModel,
  avgScore,
  reviewCount,
  tier = "UNRANKED",
}: GroupCardProps) {
  const platformInfo = PLATFORM_CONFIG[platform];
  const score = avgScore ? parseFloat(avgScore) : null;

  return (
    <Link
      href={`/groups/${slug}`}
      className="group block bg-surface-1 border border-border p-5 transition-all duration-300 hover:border-primary/30 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-sm tracking-wider text-foreground truncate group-hover:text-primary transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs font-mono"
              style={{ color: platformInfo.color }}
            >
              {platformInfo.label}
            </span>
            <span className="text-xs text-muted-foreground">
              &bull;
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {pricingModel}
            </span>
          </div>
        </div>
        <TierBadge tier={tier} size="sm" />
      </div>

      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
          {description}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <span className="text-primary font-heading text-sm">
            {score !== null ? score.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">/5</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
        </span>
      </div>
    </Link>
  );
}
