# SignalLeague Go-Live, Features & Twitter Bot — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Take SignalLeague from working MVP to production with new trust features (Transparency Score, Scam Warnings, Social Proof, Community Track Record), a submission review pipeline, and an autonomous Twitter bot — all controlled from the admin dashboard.

**Architecture:** 3-pillar system. The Next.js app serves the public site + admin dashboard + bot control panel. A separate Node.js bot service monitors Crypto Twitter 24/7, generates AI content, and auto-posts. Both share a PostgreSQL database. New DB tables store bot queue, Twitter mentions, scam flags, and trade ratings.

**Tech Stack:** Next.js 16.1, React 19, Drizzle ORM, PostgreSQL 17, Redis, MeiliSearch, Twitter API v2 (twitter-api-v2), Claude/OpenAI API, Docker Compose, Coolify/VPS

---

## Phase 1: App Running Locally (Tasks 1-5)

### Task 1: Environment Setup & Docker Services

**Files:**
- Copy: `.env.example` → `.env`
- Modify: `.env` (fill in secrets)

**Step 1: Copy env file and generate secrets**

```bash
cp .env.example .env
```

Edit `.env` and set:
```
AUTH_SECRET=<run: openssl rand -base64 32>
CRON_SECRET=<run: openssl rand -base64 32>
MEILISEARCH_API_KEY=signalleague-master-key
MINIO_SECRET_KEY=signalleague-secret
```

Leave OAuth keys empty for now (Twitter/Discord/Google) — they need developer apps registered.

**Step 2: Start Docker services (DB, Redis, MeiliSearch, MinIO)**

```bash
docker compose up -d db redis search minio
```

Expected: All 4 services healthy. Verify:
```bash
docker compose ps
```

**Step 3: Verify DB connection**

```bash
docker compose exec db psql -U signalleague -c "SELECT 1"
```

Expected: Returns `1`.

**Step 4: Commit .env to .gitignore check**

`.env` is already in `.gitignore` — verify it's NOT tracked:
```bash
git status
```

Expected: `.env` does NOT appear in untracked/modified files.

---

### Task 2: Install Dependencies & Push Schema

**Files:**
- Read: `package.json`
- Read: `drizzle.config.ts`

**Step 1: Install Node dependencies**

```bash
npm install
```

Expected: Clean install, no errors.

**Step 2: Push schema to database**

```bash
npm run db:push
```

Expected: All 14 tables created (users, accounts, sessions, verification_tokens, signal_groups, reviews, tier_rankings, tier_history, waitlist, tags, group_tags, review_votes, reports, bookmarks).

**Step 3: Verify tables exist**

```bash
docker compose exec db psql -U signalleague -c "\dt"
```

Expected: 14+ tables listed.

---

### Task 3: Seed Database & Start Dev Server

**Files:**
- Read: `src/db/seed.ts`

**Step 1: Run seed script**

```bash
npm run db:seed
```

Expected: Output shows admin user, tags, 6 groups, 4 test users, 20 reviews, tier rankings, tag assignments, waitlist entries created.

**Step 2: Start development server**

```bash
npm run dev
```

Expected: Server starts on `http://localhost:3000`.

**Step 3: Verify pages load**

Open browser and check:
- `http://localhost:3000` — Landing page (cyberpunk design)
- `http://localhost:3000/groups` — Group directory (5 approved groups)
- `http://localhost:3000/groups/cryptoalpha-signals` — Group detail page
- `http://localhost:3000/leaderboard` — Tier leaderboard
- `http://localhost:3000/admin` — Admin dashboard (may require auth)

**Step 4: Commit (nothing to commit, just verification)**

---

### Task 4: Configure OAuth (Twitter at minimum)

**Files:**
- Modify: `.env` (add OAuth credentials)
- Read: `src/lib/auth.ts`

**Step 1: Register Twitter Developer App**

Go to https://developer.twitter.com/en/portal/projects-and-apps
- Create a new app
- Set callback URL: `http://localhost:3000/api/auth/callback/twitter`
- Copy Client ID and Client Secret

**Step 2: Update `.env`**

```
AUTH_TWITTER_ID=<your-client-id>
AUTH_TWITTER_SECRET=<your-client-secret>
```

**Step 3: Test login flow**

Navigate to `http://localhost:3000/login`, click "Sign in with Twitter/X".
Expected: Redirects to Twitter OAuth, then back to app with session.

**Step 4: Verify admin role**

After logging in, check if the admin user can access `/admin`.

---

### Task 5: Sync Search Index & Test Full Flow

**Files:**
- Read: `src/lib/sync-search.ts`
- Read: `src/app/api/search/sync/route.ts`

**Step 1: Trigger MeiliSearch sync**

```bash
curl -X POST http://localhost:3000/api/search/sync \
  -H "Authorization: Bearer $(grep CRON_SECRET .env | cut -d= -f2)"
```

Expected: Returns `{ success: true }`.

**Step 2: Test search on groups page**

Navigate to `http://localhost:3000/groups` and type "crypto" in search.
Expected: Filters groups matching "crypto".

**Step 3: Test full review flow**

1. Log in via OAuth
2. Navigate to a group page
3. Click "Write a Review"
4. Submit a review
5. Verify it appears on the group page

**Step 4: Commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: local dev setup issues"
```

---

## Phase 2: New Features (Tasks 6-15)

### Task 6: Schema — Add New Tables for Bot, Scam Flags, Mentions, Trade Ratings

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/types/index.ts`

**Step 1: Add new enums to schema**

Add to `src/db/schema.ts` after the existing enums:

```typescript
export const scamRiskEnum = pgEnum("scam_risk", ["low", "medium", "high", "critical"]);

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
```

**Step 2: Add new tables**

Add after existing tables in `src/db/schema.ts`:

```typescript
// 15. scamFlags — automatic red flag detection
export const scamFlags = pgTable("scam_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => signalGroups.id, { onDelete: "cascade" }),
  flag: varchar("flag", { length: 255 }).notNull(),
  description: text("description"),
  severity: scamRiskEnum("severity").default("medium").notNull(),
  autoDetected: integer("auto_detected").default(1).notNull(), // 1=auto, 0=manual
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// 16. twitterMentions — mentions of groups found on Twitter
export const twitterMentions = pgTable("twitter_mentions", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").references(() => signalGroups.id, { onDelete: "set null" }),
  tweetId: varchar("tweet_id", { length: 64 }).notNull().unique(),
  authorHandle: varchar("author_handle", { length: 255 }).notNull(),
  authorFollowers: integer("author_followers"),
  content: text("content").notNull(),
  sentiment: mentionSentimentEnum("sentiment").default("neutral").notNull(),
  engagement: integer("engagement").default(0).notNull(), // likes + retweets + replies
  tweetedAt: timestamp("tweeted_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// 17. tradeRatings — community ratings of individual trade calls
export const tradeRatings = pgTable("trade_ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => signalGroups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  outcome: tradeOutcomeEnum("outcome").notNull(),
  returnPct: numeric("return_pct", { precision: 8, scale: 2 }), // e.g. +12.5% or -5.3%
  description: varchar("description", { length: 500 }),
  tradeDate: date("trade_date"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// 18. groupEnrichment — auto-collected external data
export const groupEnrichment = pgTable("group_enrichment", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => signalGroups.id, { onDelete: "cascade" }),
  source: enrichmentSourceEnum("source").notNull(),
  data: text("data").notNull(), // JSON blob of collected data
  collectedAt: timestamp("collected_at", { mode: "date" }).defaultNow().notNull(),
});

// 19. botQueue — posts queued for the Twitter bot
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

// 20. botConfig — bot runtime configuration
export const botConfig = pgTable("bot_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(), // JSON value
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
```

**Step 3: Add columns to signalGroups table**

Add these columns to the existing `signalGroups` table definition:

```typescript
// Add to signalGroups table:
transparencyScore: integer("transparency_score"), // 0-100
scamRisk: scamRiskEnum("scam_risk"),
twitterMentionCount7d: integer("twitter_mention_count_7d").default(0).notNull(),
sentimentScore: numeric("sentiment_score", { precision: 5, scale: 2 }), // -1.0 to +1.0
winRate: numeric("win_rate", { precision: 5, scale: 2 }), // 0-100%
totalTradeRatings: integer("total_trade_ratings").default(0).notNull(),
```

**Step 4: Add new platform to enum**

Update `platformEnum` to include `whop`:

```typescript
export const platformEnum = pgEnum("platform", [
  "twitter",
  "discord",
  "telegram",
  "whop",
]);
```

**Step 5: Add relations for new tables**

```typescript
export const scamFlagsRelations = relations(scamFlags, ({ one }) => ({
  group: one(signalGroups, {
    fields: [scamFlags.groupId],
    references: [signalGroups.id],
  }),
}));

export const twitterMentionsRelations = relations(twitterMentions, ({ one }) => ({
  group: one(signalGroups, {
    fields: [twitterMentions.groupId],
    references: [signalGroups.id],
  }),
}));

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

export const groupEnrichmentRelations = relations(groupEnrichment, ({ one }) => ({
  group: one(signalGroups, {
    fields: [groupEnrichment.groupId],
    references: [signalGroups.id],
  }),
}));
```

Also update `signalGroupsRelations` to include new relations:
```typescript
// Add to signalGroupsRelations:
scamFlags: many(scamFlags),
twitterMentions: many(twitterMentions),
tradeRatings: many(tradeRatings),
enrichment: many(groupEnrichment),
```

**Step 6: Push schema changes**

```bash
npm run db:push
```

Expected: New tables created, signalGroups columns added.

**Step 7: Commit**

```bash
git add src/db/schema.ts src/types/index.ts
git commit -m "feat: add schema for scam flags, twitter mentions, trade ratings, bot queue, enrichment"
```

---

### Task 7: Transparency Score Calculation

**Files:**
- Create: `src/lib/transparency.ts`
- Modify: `src/lib/ranking.ts` (integrate transparency into tier calc)

**Step 1: Create transparency score calculator**

Create `src/lib/transparency.ts`:

```typescript
import { db } from "@/db";
import {
  signalGroups,
  reviews,
  scamFlags,
  tradeRatings,
  groupEnrichment,
} from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";

interface TransparencyFactors {
  showsLosses: number;        // 0-20: reviews mention seeing losses
  trackRecordAge: number;     // 0-15: group has been around > 6 months
  verifiedPerformance: number; // 0-25: trade ratings exist with evidence
  fairPricing: number;        // 0-10: price vs market average
  responsiveToCriticism: number; // 0-10: responds to negative reviews
  openCommunity: number;      // 0-10: free tier or accessible info
  noFakeTestimonials: number; // 0-10: no scam flags for fake testimonials
}

export async function calculateTransparencyScore(groupId: string): Promise<{
  score: number;
  factors: TransparencyFactors;
}> {
  const [group] = await db
    .select()
    .from(signalGroups)
    .where(eq(signalGroups.id, groupId))
    .limit(1);

  if (!group) return { score: 0, factors: emptyFactors() };

  // Factor 1: Shows Losses (max 20)
  // Check if reviews mention seeing losses (cons mentioning "loss" or trade ratings with losses)
  const [tradeStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      losses: sql<number>`count(*) FILTER (WHERE outcome = 'loss')::int`,
    })
    .from(tradeRatings)
    .where(eq(tradeRatings.groupId, groupId));

  const lossRatio = tradeStats.total > 0 ? tradeStats.losses / tradeStats.total : 0;
  // Groups that show SOME losses are more transparent (20-40% loss rate is realistic)
  const showsLosses = tradeStats.total >= 5 && lossRatio > 0.15 ? 20 : (lossRatio > 0 ? 10 : 0);

  // Factor 2: Track Record Age (max 15)
  const ageMonths = group.foundedAt
    ? Math.floor((Date.now() - new Date(group.foundedAt).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 0;
  const trackRecordAge = ageMonths >= 12 ? 15 : ageMonths >= 6 ? 10 : ageMonths >= 3 ? 5 : 0;

  // Factor 3: Verified Performance (max 25)
  const verifiedPerformance = tradeStats.total >= 20 ? 25 : tradeStats.total >= 10 ? 15 : tradeStats.total >= 5 ? 8 : 0;

  // Factor 4: Fair Pricing (max 10)
  const price = group.price ? parseFloat(group.price) : 0;
  const fairPricing = group.pricingModel === "free" ? 10
    : price <= 50 ? 8
    : price <= 100 ? 5
    : price <= 200 ? 3
    : 0;

  // Factor 5: Responsive to Criticism (max 10)
  // Based on review count and balance of pros/cons
  const [reviewStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      avgRating: sql<number>`COALESCE(AVG(overall_rating::numeric), 0)`,
    })
    .from(reviews)
    .where(and(eq(reviews.groupId, groupId), eq(reviews.status, "published")));

  const responsiveToCriticism = reviewStats.count >= 5 ? 10 : reviewStats.count >= 2 ? 5 : 0;

  // Factor 6: Open Community (max 10)
  const openCommunity = group.pricingModel === "free" ? 10
    : group.pricingModel === "freemium" ? 7
    : 3;

  // Factor 7: No Fake Testimonials (max 10)
  const [flagCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scamFlags)
    .where(eq(scamFlags.groupId, groupId));

  const noFakeTestimonials = flagCount.count === 0 ? 10 : flagCount.count <= 2 ? 5 : 0;

  const factors: TransparencyFactors = {
    showsLosses,
    trackRecordAge,
    verifiedPerformance,
    fairPricing,
    responsiveToCriticism,
    openCommunity,
    noFakeTestimonials,
  };

  const score = Object.values(factors).reduce((sum, val) => sum + val, 0);

  // Persist to signalGroups
  await db
    .update(signalGroups)
    .set({ transparencyScore: score })
    .where(eq(signalGroups.id, groupId));

  return { score, factors };
}

function emptyFactors(): TransparencyFactors {
  return {
    showsLosses: 0,
    trackRecordAge: 0,
    verifiedPerformance: 0,
    fairPricing: 0,
    responsiveToCriticism: 0,
    openCommunity: 0,
    noFakeTestimonials: 0,
  };
}

export async function recalculateAllTransparencyScores() {
  const groups = await db
    .select({ id: signalGroups.id })
    .from(signalGroups)
    .where(eq(signalGroups.status, "approved"));

  const results = [];
  for (const group of groups) {
    const result = await calculateTransparencyScore(group.id);
    results.push({ groupId: group.id, ...result });
  }
  return results;
}
```

**Step 2: Run app to verify no compile errors**

```bash
npm run dev
```

Expected: Compiles without errors.

**Step 3: Commit**

```bash
git add src/lib/transparency.ts
git commit -m "feat: add transparency score calculation (7 weighted factors)"
```

---

### Task 8: Scam Warning System

**Files:**
- Create: `src/lib/scam-detection.ts`
- Create: `src/components/custom/scam-warning.tsx`

**Step 1: Create scam detection logic**

Create `src/lib/scam-detection.ts`:

```typescript
import { db } from "@/db";
import {
  signalGroups,
  scamFlags,
  reports,
  tradeRatings,
  twitterMentions,
} from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";

interface RedFlag {
  flag: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export async function detectScamFlags(groupId: string): Promise<RedFlag[]> {
  const flags: RedFlag[] = [];

  const [group] = await db
    .select()
    .from(signalGroups)
    .where(eq(signalGroups.id, groupId))
    .limit(1);

  if (!group) return flags;

  // Flag 1: Only shows winners
  const [tradeStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) FILTER (WHERE outcome = 'win')::int`,
    })
    .from(tradeRatings)
    .where(eq(tradeRatings.groupId, groupId));

  if (tradeStats.total >= 10 && tradeStats.wins / tradeStats.total > 0.9) {
    flags.push({
      flag: "only_shows_winners",
      description: `${Math.round((tradeStats.wins / tradeStats.total) * 100)}% win rate reported — suspiciously high`,
      severity: "high",
    });
  }

  // Flag 2: Account too new
  if (group.foundedAt) {
    const ageMonths = Math.floor(
      (Date.now() - new Date(group.foundedAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    if (ageMonths < 3) {
      flags.push({
        flag: "account_too_new",
        description: `Group is only ${ageMonths} month(s) old`,
        severity: "medium",
      });
    }
  }

  // Flag 3: Multiple scam reports from community
  const [reportStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.targetId, groupId),
        eq(reports.targetType, "group"),
        eq(reports.reason, "scam")
      )
    );

  if (reportStats.count >= 3) {
    flags.push({
      flag: "multiple_scam_reports",
      description: `${reportStats.count} community scam reports filed`,
      severity: reportStats.count >= 5 ? "critical" : "high",
    });
  }

  // Flag 4: Unrealistic pricing (very expensive)
  if (group.price && parseFloat(group.price) > 200) {
    flags.push({
      flag: "high_price",
      description: `$${group.price}/mo — significantly above market average`,
      severity: "medium",
    });
  }

  // Flag 5: Negative sentiment on Twitter
  const [sentimentStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      negative: sql<number>`count(*) FILTER (WHERE sentiment = 'negative')::int`,
    })
    .from(twitterMentions)
    .where(
      and(
        eq(twitterMentions.groupId, groupId),
        gte(twitterMentions.tweetedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      )
    );

  if (sentimentStats.total >= 5 && sentimentStats.negative / sentimentStats.total > 0.6) {
    flags.push({
      flag: "negative_sentiment",
      description: `${Math.round((sentimentStats.negative / sentimentStats.total) * 100)}% negative sentiment on Twitter`,
      severity: "high",
    });
  }

  // Persist flags
  // Clear old auto-detected flags
  await db.delete(scamFlags).where(
    and(eq(scamFlags.groupId, groupId), eq(scamFlags.autoDetected, 1))
  );

  // Insert new flags
  if (flags.length > 0) {
    await db.insert(scamFlags).values(
      flags.map((f) => ({
        groupId,
        flag: f.flag,
        description: f.description,
        severity: f.severity,
        autoDetected: 1,
      }))
    );
  }

  // Update scam risk on group
  const maxSeverity = flags.reduce((max, f) => {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    return order[f.severity] > order[max] ? f.severity : max;
  }, "low" as "low" | "medium" | "high" | "critical");

  await db
    .update(signalGroups)
    .set({ scamRisk: flags.length > 0 ? maxSeverity : "low" })
    .where(eq(signalGroups.id, groupId));

  return flags;
}
```

**Step 2: Create ScamWarning UI component**

Create `src/components/custom/scam-warning.tsx`:

```tsx
interface ScamWarningProps {
  flags: Array<{
    flag: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
  }>;
}

const severityConfig = {
  low: { color: "text-muted-foreground", bg: "bg-muted/10", border: "border-muted" },
  medium: { color: "text-tier-c", bg: "bg-tier-c/10", border: "border-tier-c/30" },
  high: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
  critical: { color: "text-destructive", bg: "bg-destructive/20", border: "border-destructive/50" },
};

const flagIcons: Record<string, string> = {
  only_shows_winners: "📈",
  account_too_new: "🆕",
  multiple_scam_reports: "🚨",
  high_price: "💰",
  negative_sentiment: "📉",
};

export function ScamWarning({ flags }: ScamWarningProps) {
  if (flags.length === 0) return null;

  const maxSeverity = flags.reduce((max, f) => {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    return order[f.severity] > order[max] ? f.severity : max;
  }, "low" as keyof typeof severityConfig);

  const config = severityConfig[maxSeverity];

  return (
    <div className={`${config.bg} border ${config.border} p-5 space-y-3`}>
      <div className="flex items-center gap-2">
        <span className={`font-heading text-xs tracking-wider ${config.color}`}>
          RED FLAGS DETECTED
        </span>
        <span className={`text-xs font-mono ${config.color} uppercase`}>
          Risk: {maxSeverity}
        </span>
      </div>
      <div className="space-y-2">
        {flags.map((flag, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-sm">{flagIcons[flag.flag] || "🚩"}</span>
            <p className={`text-xs font-mono ${config.color}`}>{flag.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/lib/scam-detection.ts src/components/custom/scam-warning.tsx
git commit -m "feat: add scam detection engine and warning UI component"
```

---

### Task 9: Social Proof — Twitter Mentions on Group Pages

**Files:**
- Create: `src/components/custom/social-proof.tsx`

**Step 1: Create SocialProof component**

Create `src/components/custom/social-proof.tsx`:

```tsx
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

export function SocialProof({ mentionCount7d, sentimentScore, mentions }: SocialProofProps) {
  const sentimentPct = sentimentScore !== null ? Math.round((sentimentScore + 1) * 50) : null;
  const sentimentLabel =
    sentimentPct !== null
      ? sentimentPct >= 65 ? "Positive" : sentimentPct >= 35 ? "Mixed" : "Negative"
      : "Unknown";
  const sentimentColor =
    sentimentPct !== null
      ? sentimentPct >= 65 ? "text-primary" : sentimentPct >= 35 ? "text-tier-c" : "text-destructive"
      : "text-muted-foreground";

  return (
    <div className="bg-surface-1 border border-border p-5 space-y-4">
      <h2 className="font-heading text-xs tracking-wider text-foreground">
        Community Buzz
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-heading text-tertiary">{mentionCount7d}</p>
          <p className="text-xs text-muted-foreground font-mono">Mentions (7d)</p>
        </div>
        <div>
          <p className={`text-2xl font-heading ${sentimentColor}`}>
            {sentimentPct !== null ? `${sentimentPct}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground font-mono">{sentimentLabel}</p>
        </div>
      </div>

      {mentions.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground font-mono">Recent mentions:</p>
          {mentions.slice(0, 5).map((mention) => {
            const sentColor =
              mention.sentiment === "positive" ? "border-l-primary"
              : mention.sentiment === "negative" ? "border-l-destructive"
              : "border-l-muted";

            return (
              <div
                key={mention.id}
                className={`border-l-2 ${sentColor} pl-3 py-1`}
              >
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  &quot;{mention.content}&quot;
                </p>
                <p className="text-xs text-muted-foreground/60 font-mono mt-1">
                  @{mention.authorHandle}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/custom/social-proof.tsx
git commit -m "feat: add social proof / twitter mentions component"
```

---

### Task 10: Community Track Record — Trade Rating Form & Display

**Files:**
- Create: `src/components/custom/track-record.tsx`
- Create: `src/actions/trade-ratings.ts`

**Step 1: Create server action for trade ratings**

Create `src/actions/trade-ratings.ts`:

```typescript
"use server";

import { z } from "zod";
import { db } from "@/db";
import { tradeRatings, signalGroups } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const tradeRatingSchema = z.object({
  groupId: z.string().uuid(),
  outcome: z.enum(["win", "loss", "breakeven", "unknown"]),
  returnPct: z.coerce.number().min(-100).max(10000).optional(),
  description: z.string().max(500).optional(),
  tradeDate: z.string().optional(),
});

export async function submitTradeRating(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to rate a trade" };
  }

  const parsed = tradeRatingSchema.safeParse({
    groupId: formData.get("groupId"),
    outcome: formData.get("outcome"),
    returnPct: formData.get("returnPct"),
    description: formData.get("description"),
    tradeDate: formData.get("tradeDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  try {
    await db.insert(tradeRatings).values({
      groupId: data.groupId,
      userId: session.user.id,
      outcome: data.outcome,
      returnPct: data.returnPct?.toString() ?? null,
      description: data.description || null,
      tradeDate: data.tradeDate || null,
    });

    // Update group stats
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        winRate: sql<number>`
          ROUND(
            count(*) FILTER (WHERE outcome = 'win')::numeric /
            NULLIF(count(*) FILTER (WHERE outcome IN ('win', 'loss'))::numeric, 0) * 100,
            2
          )
        `,
      })
      .from(tradeRatings)
      .where(eq(tradeRatings.groupId, data.groupId));

    await db
      .update(signalGroups)
      .set({
        totalTradeRatings: stats.total,
        winRate: stats.winRate?.toString() ?? null,
      })
      .where(eq(signalGroups.id, data.groupId));

    revalidatePath(`/groups`);
    return { success: true };
  } catch (error) {
    console.error("[TradeRatings] Submit error:", error);
    return { error: "Failed to submit trade rating." };
  }
}

export async function getTradeStats(groupId: string) {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) FILTER (WHERE outcome = 'win')::int`,
      losses: sql<number>`count(*) FILTER (WHERE outcome = 'loss')::int`,
      breakeven: sql<number>`count(*) FILTER (WHERE outcome = 'breakeven')::int`,
      avgReturn: sql<number>`COALESCE(AVG(return_pct::numeric), 0)`,
      winRate: sql<number>`
        ROUND(
          count(*) FILTER (WHERE outcome = 'win')::numeric /
          NULLIF(count(*) FILTER (WHERE outcome IN ('win', 'loss'))::numeric, 0) * 100,
          1
        )
      `,
    })
    .from(tradeRatings)
    .where(eq(tradeRatings.groupId, groupId));

  return {
    total: stats.total,
    wins: stats.wins,
    losses: stats.losses,
    breakeven: stats.breakeven,
    avgReturn: Number(stats.avgReturn),
    winRate: stats.winRate ? Number(stats.winRate) : null,
  };
}
```

**Step 2: Create TrackRecord display component**

Create `src/components/custom/track-record.tsx`:

```tsx
interface TrackRecordProps {
  stats: {
    total: number;
    wins: number;
    losses: number;
    breakeven: number;
    avgReturn: number;
    winRate: number | null;
  };
}

export function TrackRecord({ stats }: TrackRecordProps) {
  if (stats.total === 0) {
    return (
      <div className="bg-surface-1 border border-border p-5 space-y-3">
        <h2 className="font-heading text-xs tracking-wider text-foreground">
          Track Record
        </h2>
        <p className="text-xs text-muted-foreground font-mono">
          No community-verified trades yet. Be the first to rate a trade.
        </p>
      </div>
    );
  }

  const winPct = stats.winRate ?? 0;
  const winColor = winPct >= 60 ? "text-primary" : winPct >= 45 ? "text-tier-c" : "text-destructive";

  return (
    <div className="bg-surface-1 border border-border p-5 space-y-4">
      <h2 className="font-heading text-xs tracking-wider text-foreground">
        Community-Verified Track Record
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className={`text-2xl font-heading ${winColor}`}>
            {winPct.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground font-mono">Win Rate</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-heading text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground font-mono">Trades Rated</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-heading ${stats.avgReturn >= 0 ? "text-primary" : "text-destructive"}`}>
            {stats.avgReturn >= 0 ? "+" : ""}{stats.avgReturn.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground font-mono">Avg Return</p>
        </div>
      </div>

      {/* Win/Loss bar */}
      <div className="space-y-1">
        <div className="flex h-2 overflow-hidden bg-surface-3">
          <div
            className="bg-primary transition-all"
            style={{ width: `${(stats.wins / stats.total) * 100}%` }}
          />
          <div
            className="bg-muted-foreground/30 transition-all"
            style={{ width: `${(stats.breakeven / stats.total) * 100}%` }}
          />
          <div
            className="bg-destructive transition-all"
            style={{ width: `${(stats.losses / stats.total) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono text-muted-foreground">
          <span>{stats.wins}W</span>
          <span>{stats.breakeven}BE</span>
          <span>{stats.losses}L</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/60 font-mono">
        Based on {stats.total} community-submitted trade outcomes
      </p>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/actions/trade-ratings.ts src/components/custom/track-record.tsx
git commit -m "feat: add community trade rating system with track record display"
```

---

### Task 11: Integrate New Features into Group Detail Page

**Files:**
- Modify: `src/app/groups/[slug]/page.tsx`

**Step 1: Import new components and data fetchers**

Add imports and data fetching to the group detail page. Fetch scam flags, twitter mentions, trade stats, and transparency score alongside existing data. Add the new components to the sidebar:

- ScamWarning at the top of sidebar (if flags exist)
- TransparencyScore as a score bar in sidebar
- TrackRecord in the main content area after the radar chart
- SocialProof in sidebar

**Step 2: Verify page renders with all new sections**

```bash
npm run dev
```

Navigate to `http://localhost:3000/groups/cryptoalpha-signals`.
Expected: Page loads with new sections (empty data is fine — components handle zero-state).

**Step 3: Commit**

```bash
git add src/app/groups/[slug]/page.tsx
git commit -m "feat: integrate transparency score, scam warnings, social proof, track record into group page"
```

---

### Task 12: Submission Review Pipeline — Admin Queue with Dedup

**Files:**
- Modify: `src/app/admin/groups/page.tsx` (add review queue tab)
- Modify: `src/actions/admin.ts` (add dedup check, approve/reject/merge)
- Modify: `src/actions/groups.ts` (add dedup check on submission)

**Step 1: Add fuzzy dedup check to group submission**

Modify `src/actions/groups.ts` — in the `submitGroup` function, before inserting, check for similar existing groups by name and platform handle using `ilike` with Levenshtein-like fuzzy matching.

**Step 2: Add review queue to admin groups page**

Modify `src/app/admin/groups/page.tsx` to show pending groups prominently at the top with approve/reject/merge buttons. Show potential duplicate matches for each pending group.

**Step 3: Add admin actions for merge**

Add `mergeGroup(sourceId, targetId)` function to `src/actions/admin.ts` that moves all reviews/ratings from source to target, then deletes source.

**Step 4: Commit**

```bash
git add src/actions/groups.ts src/actions/admin.ts src/app/admin/groups/page.tsx
git commit -m "feat: add submission review pipeline with dedup check and merge"
```

---

### Task 13: Bot Control Dashboard — Admin UI

**Files:**
- Create: `src/app/admin/bot/page.tsx`
- Create: `src/app/admin/bot/config/page.tsx`
- Create: `src/actions/bot.ts`
- Modify: `src/app/admin/layout.tsx` (add bot nav item)

**Step 1: Create bot server actions**

Create `src/actions/bot.ts` with functions:
- `getBotStats()` — post count, engagement, follower growth, queue size
- `getBotQueue()` — pending/recent posts
- `updateBotConfig(key, value)` — update keywords, watchlist, posting rate
- `getBotConfig()` — read all config
- `skipQueuedPost(id)` — mark a queued post as skipped
- `manualPost(content)` — queue a manual tweet

**Step 2: Create bot dashboard page**

Create `src/app/admin/bot/page.tsx` showing:
- Stats cards (posts today, engagement, queue size, follower count)
- Recent posts feed with status (posted/failed/queued)
- Quick actions (kill switch, pause, manual post)

**Step 3: Create bot config page**

Create `src/app/admin/bot/config/page.tsx` with forms for:
- Keywords to monitor (comma-separated)
- Watchlist accounts (Twitter handles)
- Max posts per hour
- Posting hours (UTC)
- Tone presets (investigative, provocative, neutral)
- Blocked accounts

**Step 4: Add bot nav item to admin layout**

Modify `src/app/admin/layout.tsx` — add "Bot" link to the admin navigation.

**Step 5: Commit**

```bash
git add src/app/admin/bot/ src/actions/bot.ts src/app/admin/layout.tsx
git commit -m "feat: add bot control dashboard with config, stats, and queue management"
```

---

### Task 14: Add Whop Platform Support + Enrich .env

**Files:**
- Modify: `src/types/index.ts` (add whop to PLATFORM_CONFIG)
- Modify: `.env.example` (add bot-related env vars)

**Step 1: Add Whop to platform config**

In `src/types/index.ts`, add Whop entry to `PLATFORM_CONFIG`:
```typescript
whop: { label: "Whop", color: "#7C3AED" },
```

**Step 2: Update .env.example with bot variables**

```
# Twitter Bot
TWITTER_BOT_API_KEY=
TWITTER_BOT_API_SECRET=
TWITTER_BOT_ACCESS_TOKEN=
TWITTER_BOT_ACCESS_SECRET=
TWITTER_BOT_BEARER_TOKEN=

# AI (for bot content generation)
OPENAI_API_KEY=
# or
ANTHROPIC_API_KEY=
```

**Step 3: Commit**

```bash
git add src/types/index.ts .env.example
git commit -m "feat: add Whop platform support and bot env vars"
```

---

### Task 15: Cron Job — Recalculate Transparency + Scam Flags

**Files:**
- Modify: `src/app/api/cron/recalculate-tiers/route.ts`

**Step 1: Extend existing cron to also recalculate transparency and scam flags**

The existing cron at `src/app/api/cron/recalculate-tiers/route.ts` recalculates tier rankings. Extend it to also call `recalculateAllTransparencyScores()` and `detectScamFlags()` for each group after tier calculation.

**Step 2: Commit**

```bash
git add src/app/api/cron/recalculate-tiers/route.ts
git commit -m "feat: extend cron to recalculate transparency scores and detect scam flags"
```

---

## Phase 3: Twitter Bot Service (Tasks 16-20)

### Task 16: Bot Service Scaffold

**Files:**
- Create: `bot/package.json`
- Create: `bot/tsconfig.json`
- Create: `bot/src/index.ts`
- Create: `bot/src/config.ts`
- Create: `bot/src/db.ts`
- Modify: `docker-compose.yml` (add bot service)

**Step 1: Create bot directory and package.json**

Create `bot/package.json`:
```json
{
  "name": "signalleague-bot",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc"
  },
  "dependencies": {
    "twitter-api-v2": "^1.19.0",
    "pg": "^8.18.0",
    "drizzle-orm": "^0.45.1",
    "openai": "^4.80.0",
    "ioredis": "^5.9.2",
    "cron": "^3.3.1"
  },
  "devDependencies": {
    "@types/node": "^25.2.0",
    "@types/pg": "^8.16.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}
```

**Step 2: Create bot entry point**

Create `bot/src/index.ts` with the main loop:
- Connect to DB (shared PostgreSQL)
- Connect to Redis (shared)
- Connect to Twitter API
- Start monitoring pipeline
- Start posting pipeline (on timer)
- Log all activity to console + DB

**Step 3: Create bot config loader**

Create `bot/src/config.ts` that reads from `botConfig` DB table + env vars.

**Step 4: Create shared DB client**

Create `bot/src/db.ts` that imports schema from the main app's schema file (shared).

**Step 5: Add bot to docker-compose.yml**

```yaml
bot:
  container_name: signalleague-bot
  build:
    context: ./bot
    dockerfile: Dockerfile
  env_file:
    - .env
  depends_on:
    db:
      condition: service_healthy
    redis:
      condition: service_healthy
  networks:
    - signalleague
  restart: unless-stopped
```

**Step 6: Commit**

```bash
git add bot/ docker-compose.yml
git commit -m "feat: scaffold Twitter bot service with Docker setup"
```

---

### Task 17: Bot Monitor Pipeline — Twitter Stream + Search

**Files:**
- Create: `bot/src/monitor.ts`
- Create: `bot/src/twitter.ts`

**Step 1: Create Twitter client wrapper**

Create `bot/src/twitter.ts`:
- Initialize TwitterApi with credentials from env
- Helper functions: `searchRecentTweets(query)`, `getTweetById(id)`, `getUserByHandle(handle)`, `postTweet(content, options)`
- Rate limit handling with exponential backoff

**Step 2: Create monitor pipeline**

Create `bot/src/monitor.ts`:
- `startMonitoring()` function that runs on interval (every 2 minutes)
- Search for keywords: "signal group", "PnL", "join my VIP", "free signals", "copy my trades", etc.
- For each matching tweet:
  1. Check if already processed (tweet ID in `twitterMentions`)
  2. Classify content type (PnL post, group promo, drama, scam report)
  3. Extract any group links (Whop, Discord, Telegram)
  4. Store in `twitterMentions` table
  5. If new group discovered → insert as `pending_review` into `signalGroups`
  6. If relevant enough → queue a bot response in `botQueue`

**Step 3: Commit**

```bash
git add bot/src/monitor.ts bot/src/twitter.ts
git commit -m "feat: add Twitter monitor pipeline with keyword search and classification"
```

---

### Task 18: Bot AI Content Generator

**Files:**
- Create: `bot/src/generator.ts`
- Create: `bot/src/prompts.ts`

**Step 1: Create prompt templates**

Create `bot/src/prompts.ts` with CT-native prompt templates for each post type:
- PnL commentary (questioning, witty)
- Group review link (sharing community data)
- Scam alert (warning with evidence)
- General CT take (memey, engaging)
- Group discovery announcement

Each template includes:
- System prompt establishing CT persona
- Dynamic context (tweet content, group data, stats)
- Instruction to include signalleague.com link where relevant
- Character limit guidance (280 chars for tweets)

**Step 2: Create content generator**

Create `bot/src/generator.ts`:
- `generateContent(postType, context)` function
- Calls OpenAI/Anthropic API with the appropriate prompt
- Returns generated tweet content
- Includes content safety checks (no doxxing, no financial advice disclaimers needed for commentary)

**Step 3: Commit**

```bash
git add bot/src/generator.ts bot/src/prompts.ts
git commit -m "feat: add AI content generator with CT-native prompt templates"
```

---

### Task 19: Bot Posting Pipeline

**Files:**
- Create: `bot/src/poster.ts`
- Create: `bot/src/scheduler.ts`

**Step 1: Create posting pipeline**

Create `bot/src/poster.ts`:
- `processQueue()` — reads `botQueue` where status = 'queued' and `scheduledFor <= now()`
- Posts each item via Twitter API
- Updates status to 'posted' with `postedTweetId` and `postedAt`
- On failure: updates status to 'failed' with `errorMessage`
- Respects rate limits (configurable max posts/hour from `botConfig`)

**Step 2: Create scheduler**

Create `bot/src/scheduler.ts`:
- Cron-based scheduler running every minute
- Checks queue, picks next item to post
- Respects posting hours (configurable via `botConfig`)
- Optimal timing: posts during peak CT hours (US morning, EU evening)

**Step 3: Commit**

```bash
git add bot/src/poster.ts bot/src/scheduler.ts
git commit -m "feat: add bot posting pipeline with scheduler and rate limiting"
```

---

### Task 20: Bot Integration Tests & Full Pipeline Verification

**Files:**
- Create: `bot/src/test-pipeline.ts`

**Step 1: Create integration test script**

Create `bot/src/test-pipeline.ts`:
- Runs the full pipeline in dry-run mode (no actual Twitter posts)
- Tests: DB connection, Twitter API auth, keyword search, content generation, queue insertion
- Outputs results to console

**Step 2: Run test**

```bash
cd bot && npm install && npx tsx src/test-pipeline.ts
```

Expected: All pipeline stages pass, sample content generated but not posted.

**Step 3: Commit**

```bash
git add bot/src/test-pipeline.ts
git commit -m "feat: add bot integration test pipeline"
```

---

## Post-Implementation Checklist

After all 20 tasks:

- [ ] All Docker services start cleanly: `docker compose up -d`
- [ ] App loads at `http://localhost:3000` with seed data
- [ ] Group pages show transparency score, scam warnings, social proof, track record
- [ ] Admin dashboard shows bot control panel
- [ ] Bot service starts and connects to Twitter API
- [ ] Bot monitors keywords and queues posts
- [ ] Bot posts are visible in dashboard
- [ ] Submission pipeline works (submit → review → approve/reject)
- [ ] Cron recalculates all scores
