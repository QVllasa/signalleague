import * as React from "react";
import { cn } from "@/lib/utils";

interface Mention {
  id: string;
  authorHandle: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  engagement: number;
  tweetedAt: Date;
}

interface SocialProofProps {
  mentionCount7d: number;
  sentimentScore: number | null; // -1.0 to +1.0
  mentions: Mention[];
}

const sentimentBorderColor: Record<Mention["sentiment"], string> = {
  positive: "border-l-primary",
  negative: "border-l-destructive",
  neutral: "border-l-muted",
};

function deriveSentiment(score: number | null): {
  label: string;
  pct: string;
  colorClass: string;
} {
  if (score === null) {
    return { label: "Unknown", pct: "\u2014", colorClass: "text-muted-foreground" };
  }

  const pct = Math.round(((score + 1) / 2) * 100);

  if (pct >= 65) {
    return { label: "Positive", pct: `${pct}%`, colorClass: "text-primary" };
  }
  if (pct >= 35) {
    return { label: "Mixed", pct: `${pct}%`, colorClass: "text-tier-c" };
  }
  return { label: "Negative", pct: `${pct}%`, colorClass: "text-destructive" };
}

function SocialProof({ mentionCount7d, sentimentScore, mentions }: SocialProofProps) {
  const sentiment = deriveSentiment(sentimentScore);
  const visibleMentions = mentions.slice(0, 5);

  return (
    <div className="bg-surface-1 border border-border p-4 font-mono">
      {/* Header */}
      <h3 className="font-heading text-xs tracking-wider uppercase text-foreground mb-3">
        Community Buzz
      </h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Mentions (7d) */}
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Mentions (7d)
          </span>
          <span className="block text-lg font-heading text-tertiary">
            {mentionCount7d.toLocaleString()}
          </span>
        </div>

        {/* Sentiment */}
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Sentiment
          </span>
          <span className={cn("block text-lg font-heading", sentiment.colorClass)}>
            {sentiment.pct}
          </span>
          <span className={cn("block text-[10px]", sentiment.colorClass)}>
            {sentiment.label}
          </span>
        </div>
      </div>

      {/* Recent mentions */}
      {visibleMentions.length > 0 && (
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Recent Mentions
          </span>
          <div className="space-y-2">
            {visibleMentions.map((mention) => (
              <div
                key={mention.id}
                className={cn(
                  "border-l-2 pl-3 py-1",
                  sentimentBorderColor[mention.sentiment]
                )}
              >
                <p className="text-xs text-foreground/80 line-clamp-2">
                  &quot;{mention.content}&quot;
                </p>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  @{mention.authorHandle}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

SocialProof.displayName = "SocialProof";

export { SocialProof };
export type { SocialProofProps, Mention };
