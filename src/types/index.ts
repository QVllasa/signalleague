// ============================================
// SignalLeague — Shared Types
// ============================================

export type UserRole = "user" | "moderator" | "admin";

export type Platform = "twitter" | "discord" | "telegram";

export type AssetClass = "crypto" | "forex" | "stocks" | "options";

export type PricingModel = "free" | "paid" | "freemium";

export type GroupStatus = "pending" | "approved" | "rejected" | "suspended";

export type ReviewStatus = "published" | "flagged" | "removed";

export type MembershipDuration =
  | "less_than_1_month"
  | "1_to_3_months"
  | "3_to_6_months"
  | "6_to_12_months"
  | "over_1_year";

export type Tier = "S" | "A" | "B" | "C" | "D" | "F" | "UNRANKED";

export type VoteType = "helpful" | "unhelpful";

export type ReportReason =
  | "spam"
  | "fake_review"
  | "scam"
  | "inappropriate"
  | "other";

export type ReportTargetType = "review" | "group";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export type WaitlistStatus = "active" | "converted" | "unsubscribed";

// Tier configuration
export const TIER_CONFIG: Record<
  Tier,
  { label: string; color: string; minScore: number; maxScore: number }
> = {
  S: { label: "Elite", color: "var(--color-tier-s)", minScore: 90, maxScore: 100 },
  A: { label: "Excellent", color: "var(--color-tier-a)", minScore: 75, maxScore: 89 },
  B: { label: "Good", color: "var(--color-tier-b)", minScore: 60, maxScore: 74 },
  C: { label: "Average", color: "var(--color-tier-c)", minScore: 45, maxScore: 59 },
  D: { label: "Below Average", color: "var(--color-tier-d)", minScore: 30, maxScore: 44 },
  F: { label: "Poor", color: "var(--color-tier-f)", minScore: 0, maxScore: 29 },
  UNRANKED: { label: "Unranked", color: "var(--color-tier-unranked)", minScore: -1, maxScore: -1 },
};

// Review category labels
export const REVIEW_CATEGORIES = {
  signalQuality: {
    label: "Signal Quality",
    description: "How accurate and profitable are the signals?",
  },
  riskManagement: {
    label: "Risk Management",
    description: "Do they provide clear stop-losses and position sizing?",
  },
  valueForMoney: {
    label: "Value for Money",
    description: "Is the price justified by the value you receive?",
  },
  communitySupport: {
    label: "Community & Support",
    description: "How responsive and helpful is the community?",
  },
  transparency: {
    label: "Transparency",
    description: "Do they share performance records openly?",
  },
} as const;

// Platform configuration
export const PLATFORM_CONFIG: Record<
  Platform,
  { label: string; icon: string; color: string }
> = {
  twitter: { label: "Twitter/X", icon: "twitter", color: "#1DA1F2" },
  discord: { label: "Discord", icon: "message-circle", color: "#5865F2" },
  telegram: { label: "Telegram", icon: "send", color: "#0088cc" },
};
