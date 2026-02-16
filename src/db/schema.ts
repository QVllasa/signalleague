import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  serial,
  date,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);

export const platformEnum = pgEnum("platform", [
  "twitter",
  "discord",
  "telegram",
  "whop",
]);

export const assetClassEnum = pgEnum("asset_class", [
  "crypto",
  "forex",
  "stocks",
  "options",
]);

export const pricingModelEnum = pgEnum("pricing_model", [
  "free",
  "paid",
  "freemium",
]);

export const groupStatusEnum = pgEnum("group_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "published",
  "flagged",
  "removed",
]);

export const membershipDurationEnum = pgEnum("membership_duration", [
  "less_than_1_month",
  "1_to_3_months",
  "3_to_6_months",
  "6_to_12_months",
  "over_1_year",
]);

export const tierEnum = pgEnum("tier", [
  "S",
  "A",
  "B",
  "C",
  "D",
  "F",
  "UNRANKED",
]);

export const waitlistStatusEnum = pgEnum("waitlist_status", [
  "active",
  "converted",
  "unsubscribed",
]);

export const voteTypeEnum = pgEnum("vote_type", ["helpful", "unhelpful"]);

export const reportTargetTypeEnum = pgEnum("report_target_type", [
  "review",
  "group",
]);

export const reportReasonEnum = pgEnum("report_reason", [
  "spam",
  "fake_review",
  "scam",
  "inappropriate",
  "other",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "reviewed",
  "resolved",
  "dismissed",
]);

export const scamRiskEnum = pgEnum("scam_risk", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const botPostStatusEnum = pgEnum("bot_post_status", [
  "queued",
  "posted",
  "failed",
  "skipped",
]);

export const botPostTypeEnum = pgEnum("bot_post_type", [
  "pnl_commentary",
  "group_review",
  "scam_alert",
  "general_ct",
  "group_discovery",
]);

export const mentionSentimentEnum = pgEnum("mention_sentiment", [
  "positive",
  "negative",
  "neutral",
]);

export const tradeOutcomeEnum = pgEnum("trade_outcome", [
  "win",
  "loss",
  "breakeven",
  "unknown",
]);

export const enrichmentSourceEnum = pgEnum("enrichment_source", [
  "twitter",
  "discord",
  "telegram",
  "whop",
  "website",
]);

// ─── Tables ─────────────────────────────────────────────────────────────────────

// 1. users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  bio: text("bio"),
  role: userRoleEnum("role").default("user").notNull(),
  reputationScore: integer("reputation_score").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// 2. accounts (Auth.js adapter)
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => [
    primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  ]
);

// 3. sessions (Auth.js adapter)
export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 })
    .notNull()
    .primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// 4. verificationTokens (Auth.js adapter)
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.identifier, table.token],
    }),
  ]
);

// 5. signalGroups
export const signalGroups = pgTable("signal_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  platform: platformEnum("platform").notNull(),
  platformHandle: varchar("platform_handle", { length: 255 }),
  platformUrl: varchar("platform_url", { length: 512 }),
  assetClass: assetClassEnum("asset_class").default("crypto").notNull(),
  pricingModel: pricingModelEnum("pricing_model").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  estimatedMembers: integer("estimated_members"),
  foundedAt: date("founded_at"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  submittedBy: uuid("submitted_by").references(() => users.id, {
    onDelete: "set null",
  }),
  status: groupStatusEnum("status").default("pending").notNull(),
  avgScore: numeric("avg_score", { precision: 3, scale: 1 }),
  reviewCount: integer("review_count").default(0).notNull(),
  transparencyScore: integer("transparency_score"),
  scamRisk: scamRiskEnum("scam_risk"),
  twitterMentionCount7d: integer("twitter_mention_count_7d").default(0).notNull(),
  sentimentScore: numeric("sentiment_score", { precision: 5, scale: 2 }),
  winRate: numeric("win_rate", { precision: 5, scale: 2 }),
  totalTradeRatings: integer("total_trade_ratings").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// 6. reviews
export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupId: uuid("group_id")
    .notNull()
    .references(() => signalGroups.id, { onDelete: "cascade" }),
  overallRating: numeric("overall_rating", {
    precision: 2,
    scale: 1,
  }).notNull(),
  signalQuality: numeric("signal_quality", {
    precision: 2,
    scale: 1,
  }).notNull(),
  riskManagement: numeric("risk_management", {
    precision: 2,
    scale: 1,
  }).notNull(),
  valueForMoney: numeric("value_for_money", {
    precision: 2,
    scale: 1,
  }).notNull(),
  communitySupport: numeric("community_support", {
    precision: 2,
    scale: 1,
  }).notNull(),
  transparency: numeric("transparency", {
    precision: 2,
    scale: 1,
  }).notNull(),
  title: varchar("title", { length: 100 }),
  body: text("body"),
  membershipDuration: membershipDurationEnum("membership_duration"),
  pros: text("pros").array(),
  cons: text("cons").array(),
  helpfulCount: integer("helpful_count").default(0).notNull(),
  status: reviewStatusEnum("status").default("published").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// 7. tierRankings
export const tierRankings = pgTable("tier_rankings", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .unique()
    .references(() => signalGroups.id, { onDelete: "cascade" }),
  tier: tierEnum("tier").notNull(),
  algorithmScore: numeric("algorithm_score", { precision: 5, scale: 2 }),
  communityVoteScore: numeric("community_vote_score", {
    precision: 5,
    scale: 2,
  }),
  totalScore: numeric("total_score", { precision: 5, scale: 2 }),
  calculatedAt: timestamp("calculated_at", { mode: "date" })
    .defaultNow()
    .notNull(),
});

// 8. tierHistory
export const tierHistory = pgTable("tier_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => signalGroups.id, { onDelete: "cascade" }),
  tier: tierEnum("tier").notNull(),
  totalScore: numeric("total_score", { precision: 5, scale: 2 }),
  recordedAt: timestamp("recorded_at", { mode: "date" })
    .defaultNow()
    .notNull(),
});

// 9. waitlist
export const waitlist = pgTable("waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  referralCode: varchar("referral_code", { length: 50 }).notNull().unique(),
  referredBy: varchar("referred_by", { length: 50 }),
  position: integer("position"),
  status: waitlistStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// 10. tags
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
});

// 11. groupTags (junction table)
export const groupTags = pgTable(
  "group_tags",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => signalGroups.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.groupId, table.tagId],
    }),
  ]
);

// 12. reviewVotes
export const reviewVotes = pgTable(
  "review_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    voteType: voteTypeEnum("vote_type").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [unique("review_votes_user_review_unique").on(table.userId, table.reviewId)]
);

// 13. reports
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reason: reportReasonEnum("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
});

// 14. bookmarks
export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => signalGroups.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.groupId],
    }),
  ]
);

// 15. scamFlags
export const scamFlags = pgTable("scam_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").references(() => signalGroups.id, {
    onDelete: "cascade",
  }),
  flag: varchar("flag", { length: 255 }).notNull(),
  description: text("description"),
  severity: scamRiskEnum("severity").default("medium").notNull(),
  autoDetected: integer("auto_detected").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// 16. twitterMentions
export const twitterMentions = pgTable("twitter_mentions", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").references(() => signalGroups.id, {
    onDelete: "set null",
  }),
  tweetId: varchar("tweet_id", { length: 64 }).notNull().unique(),
  authorHandle: varchar("author_handle", { length: 255 }).notNull(),
  authorFollowers: integer("author_followers"),
  content: text("content").notNull(),
  sentiment: mentionSentimentEnum("sentiment").default("neutral").notNull(),
  engagement: integer("engagement").default(0).notNull(),
  tweetedAt: timestamp("tweeted_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// 17. tradeRatings
export const tradeRatings = pgTable("trade_ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => signalGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  outcome: tradeOutcomeEnum("outcome").notNull(),
  returnPct: numeric("return_pct", { precision: 8, scale: 2 }),
  description: varchar("description", { length: 500 }),
  tradeDate: date("trade_date"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// 18. groupEnrichment
export const groupEnrichment = pgTable("group_enrichment", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => signalGroups.id, { onDelete: "cascade" }),
  source: enrichmentSourceEnum("source").notNull(),
  data: text("data").notNull(),
  collectedAt: timestamp("collected_at", { mode: "date" })
    .defaultNow()
    .notNull(),
});

// 19. botQueue
export const botQueue = pgTable("bot_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  postType: botPostTypeEnum("post_type").notNull(),
  content: text("content").notNull(),
  replyToTweetId: varchar("reply_to_tweet_id", { length: 64 }),
  quoteTweetId: varchar("quote_tweet_id", { length: 64 }),
  relatedGroupId: uuid("related_group_id").references(() => signalGroups.id, {
    onDelete: "set null",
  }),
  triggerTweetId: varchar("trigger_tweet_id", { length: 64 }),
  status: botPostStatusEnum("status").default("queued").notNull(),
  scheduledFor: timestamp("scheduled_for", { mode: "date" }),
  postedAt: timestamp("posted_at", { mode: "date" }),
  postedTweetId: varchar("posted_tweet_id", { length: 64 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// 20. botConfig
export const botConfig = pgTable("bot_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Relations ──────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  reviews: many(reviews),
  reviewVotes: many(reviewVotes),
  reports: many(reports),
  bookmarks: many(bookmarks),
  submittedGroups: many(signalGroups),
  tradeRatings: many(tradeRatings),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const signalGroupsRelations = relations(
  signalGroups,
  ({ one, many }) => ({
    submitter: one(users, {
      fields: [signalGroups.submittedBy],
      references: [users.id],
    }),
    reviews: many(reviews),
    tierRanking: one(tierRankings, {
      fields: [signalGroups.id],
      references: [tierRankings.groupId],
    }),
    tierHistory: many(tierHistory),
    groupTags: many(groupTags),
    bookmarks: many(bookmarks),
    scamFlags: many(scamFlags),
    twitterMentions: many(twitterMentions),
    tradeRatings: many(tradeRatings),
    enrichment: many(groupEnrichment),
  })
);

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  group: one(signalGroups, {
    fields: [reviews.groupId],
    references: [signalGroups.id],
  }),
  votes: many(reviewVotes),
}));

export const tierRankingsRelations = relations(tierRankings, ({ one }) => ({
  group: one(signalGroups, {
    fields: [tierRankings.groupId],
    references: [signalGroups.id],
  }),
}));

export const tierHistoryRelations = relations(tierHistory, ({ one }) => ({
  group: one(signalGroups, {
    fields: [tierHistory.groupId],
    references: [signalGroups.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  groupTags: many(groupTags),
}));

export const groupTagsRelations = relations(groupTags, ({ one }) => ({
  group: one(signalGroups, {
    fields: [groupTags.groupId],
    references: [signalGroups.id],
  }),
  tag: one(tags, {
    fields: [groupTags.tagId],
    references: [tags.id],
  }),
}));

export const reviewVotesRelations = relations(reviewVotes, ({ one }) => ({
  user: one(users, {
    fields: [reviewVotes.userId],
    references: [users.id],
  }),
  review: one(reviews, {
    fields: [reviewVotes.reviewId],
    references: [reviews.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  group: one(signalGroups, {
    fields: [bookmarks.groupId],
    references: [signalGroups.id],
  }),
}));

export const scamFlagsRelations = relations(scamFlags, ({ one }) => ({
  group: one(signalGroups, {
    fields: [scamFlags.groupId],
    references: [signalGroups.id],
  }),
}));

export const twitterMentionsRelations = relations(
  twitterMentions,
  ({ one }) => ({
    group: one(signalGroups, {
      fields: [twitterMentions.groupId],
      references: [signalGroups.id],
    }),
  })
);

export const tradeRatingsRelations = relations(tradeRatings, ({ one }) => ({
  group: one(signalGroups, {
    fields: [tradeRatings.groupId],
    references: [signalGroups.id],
  }),
  user: one(users, {
    fields: [tradeRatings.userId],
    references: [users.id],
  }),
}));

export const groupEnrichmentRelations = relations(
  groupEnrichment,
  ({ one }) => ({
    group: one(signalGroups, {
      fields: [groupEnrichment.groupId],
      references: [signalGroups.id],
    }),
  })
);
