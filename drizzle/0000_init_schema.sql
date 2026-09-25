CREATE TYPE "public"."asset_class" AS ENUM('crypto', 'forex', 'stocks', 'options');--> statement-breakpoint
CREATE TYPE "public"."bot_post_status" AS ENUM('queued', 'posted', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."bot_post_type" AS ENUM('pnl_commentary', 'group_review', 'scam_alert', 'general_ct', 'group_discovery');--> statement-breakpoint
CREATE TYPE "public"."enrichment_source" AS ENUM('twitter', 'discord', 'telegram', 'whop', 'website');--> statement-breakpoint
CREATE TYPE "public"."group_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."membership_duration" AS ENUM('less_than_1_month', '1_to_3_months', '3_to_6_months', '6_to_12_months', 'over_1_year');--> statement-breakpoint
CREATE TYPE "public"."mention_sentiment" AS ENUM('positive', 'negative', 'neutral');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('twitter', 'discord', 'telegram', 'whop');--> statement-breakpoint
CREATE TYPE "public"."pricing_model" AS ENUM('free', 'paid', 'freemium');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'fake_review', 'scam', 'inappropriate', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'reviewed', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('review', 'group');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('published', 'flagged', 'removed');--> statement-breakpoint
CREATE TYPE "public"."scam_risk" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('S', 'A', 'B', 'C', 'D', 'F', 'UNRANKED');--> statement-breakpoint
CREATE TYPE "public"."trade_outcome" AS ENUM('win', 'loss', 'breakeven', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vote_type" AS ENUM('helpful', 'unhelpful');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('active', 'converted', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_group_id_pk" PRIMARY KEY("user_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "bot_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bot_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "bot_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_type" "bot_post_type" NOT NULL,
	"content" text NOT NULL,
	"reply_to_tweet_id" varchar(64),
	"quote_tweet_id" varchar(64),
	"related_group_id" uuid,
	"trigger_tweet_id" varchar(64),
	"status" "bot_post_status" DEFAULT 'queued' NOT NULL,
	"scheduled_for" timestamp,
	"posted_at" timestamp,
	"posted_tweet_id" varchar(64),
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_enrichment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"source" "enrichment_source" NOT NULL,
	"data" text NOT NULL,
	"collected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_tags" (
	"group_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "group_tags_group_id_tag_id_pk" PRIMARY KEY("group_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" "report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"description" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "review_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"vote_type" "vote_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_votes_user_review_unique" UNIQUE("user_id","review_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"overall_rating" numeric(2, 1) NOT NULL,
	"signal_quality" numeric(2, 1) NOT NULL,
	"risk_management" numeric(2, 1) NOT NULL,
	"value_for_money" numeric(2, 1) NOT NULL,
	"community_support" numeric(2, 1) NOT NULL,
	"transparency" numeric(2, 1) NOT NULL,
	"title" varchar(100),
	"body" text,
	"membership_duration" "membership_duration",
	"pros" text[],
	"cons" text[],
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"status" "review_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scam_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid,
	"flag" varchar(255) NOT NULL,
	"description" text,
	"severity" "scam_risk" DEFAULT 'medium' NOT NULL,
	"auto_detected" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signal_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"platform" "platform" NOT NULL,
	"platform_handle" varchar(255),
	"platform_url" varchar(512),
	"asset_class" "asset_class" DEFAULT 'crypto' NOT NULL,
	"pricing_model" "pricing_model" NOT NULL,
	"price" numeric(10, 2),
	"estimated_members" integer,
	"founded_at" date,
	"logo_url" text,
	"banner_url" text,
	"submitted_by" uuid,
	"status" "group_status" DEFAULT 'pending' NOT NULL,
	"avg_score" numeric(3, 1),
	"review_count" integer DEFAULT 0 NOT NULL,
	"transparency_score" integer,
	"scam_risk" "scam_risk",
	"twitter_mention_count_7d" integer DEFAULT 0 NOT NULL,
	"sentiment_score" numeric(5, 2),
	"win_rate" numeric(5, 2),
	"total_trade_ratings" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "signal_groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tier_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"tier" "tier" NOT NULL,
	"total_score" numeric(5, 2),
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tier_rankings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"tier" "tier" NOT NULL,
	"algorithm_score" numeric(5, 2),
	"community_vote_score" numeric(5, 2),
	"total_score" numeric(5, 2),
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tier_rankings_group_id_unique" UNIQUE("group_id")
);
--> statement-breakpoint
CREATE TABLE "trade_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"outcome" "trade_outcome" NOT NULL,
	"return_pct" numeric(8, 2),
	"description" varchar(500),
	"trade_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "twitter_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid,
	"tweet_id" varchar(64) NOT NULL,
	"author_handle" varchar(255) NOT NULL,
	"author_followers" integer,
	"content" text NOT NULL,
	"sentiment" "mention_sentiment" DEFAULT 'neutral' NOT NULL,
	"engagement" integer DEFAULT 0 NOT NULL,
	"tweeted_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "twitter_mentions_tweet_id_unique" UNIQUE("tweet_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"email_verified" timestamp,
	"image" text,
	"bio" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"reputation_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"referral_code" varchar(50) NOT NULL,
	"referred_by" varchar(50),
	"position" integer,
	"status" "waitlist_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email"),
	CONSTRAINT "waitlist_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_group_id_signal_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signal_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_queue" ADD CONSTRAINT "bot_queue_related_group_id_signal_groups_id_fk" FOREIGN KEY ("related_group_id") REFERENCES "public"."signal_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_enrichment" ADD CONSTRAINT "group_enrichment_group_id_signal_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signal_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tags" ADD CONSTRAINT "group_tags_group_id_signal_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signal_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tags" ADD CONSTRAINT "group_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_group_id_signal_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signal_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scam_flags" ADD CONSTRAINT "scam_flags_group_id_signal_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signal_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_groups" ADD CONSTRAINT "signal_groups_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_history" ADD CONSTRAINT "tier_history_group_id_signal_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signal_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_rankings" ADD CONSTRAINT "tier_rankings_group_id_signal_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signal_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_ratings" ADD CONSTRAINT "trade_ratings_group_id_signal_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signal_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_ratings" ADD CONSTRAINT "trade_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twitter_mentions" ADD CONSTRAINT "twitter_mentions_group_id_signal_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signal_groups"("id") ON DELETE set null ON UPDATE no action;