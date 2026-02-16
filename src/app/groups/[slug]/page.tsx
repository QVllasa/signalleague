export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { TierBadge } from "@/components/custom/tier-badge";
import { StarRating } from "@/components/custom/star-rating";
import { RadarChart } from "@/components/groups/radar-chart";
import { Button } from "@/components/ui/button";
import { PLATFORM_CONFIG, REVIEW_CATEGORIES } from "@/types";
import { db } from "@/db";
import { signalGroups, reviews, tierRankings, users, scamFlags, twitterMentions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ScamWarning } from "@/components/custom/scam-warning";
import { SocialProof } from "@/components/custom/social-proof";
import { TrackRecord } from "@/components/custom/track-record";
import { getTradeStats } from "@/actions/trade-ratings";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getGroup(slug: string) {
  const [group] = await db
    .select()
    .from(signalGroups)
    .where(eq(signalGroups.slug, slug))
    .limit(1);

  if (!group) return null;

  const [ranking] = await db
    .select()
    .from(tierRankings)
    .where(eq(tierRankings.groupId, group.id))
    .limit(1);

  const groupReviews = await db
    .select({
      id: reviews.id,
      overallRating: reviews.overallRating,
      signalQuality: reviews.signalQuality,
      riskManagement: reviews.riskManagement,
      valueForMoney: reviews.valueForMoney,
      communitySupport: reviews.communitySupport,
      transparency: reviews.transparency,
      title: reviews.title,
      body: reviews.body,
      pros: reviews.pros,
      cons: reviews.cons,
      helpfulCount: reviews.helpfulCount,
      createdAt: reviews.createdAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.groupId, group.id))
    .orderBy(desc(reviews.createdAt))
    .limit(20);

  // Fetch scam flags for this group
  const groupScamFlags = await db
    .select({
      flag: scamFlags.flag,
      description: scamFlags.description,
      severity: scamFlags.severity,
    })
    .from(scamFlags)
    .where(eq(scamFlags.groupId, group.id));

  // Fetch recent twitter mentions (last 5)
  const recentMentions = await db
    .select({
      id: twitterMentions.id,
      authorHandle: twitterMentions.authorHandle,
      content: twitterMentions.content,
      sentiment: twitterMentions.sentiment,
      engagement: twitterMentions.engagement,
      tweetedAt: twitterMentions.tweetedAt,
    })
    .from(twitterMentions)
    .where(eq(twitterMentions.groupId, group.id))
    .orderBy(desc(twitterMentions.tweetedAt))
    .limit(5);

  // Fetch trade stats
  const tradeStats = await getTradeStats(group.id);

  return {
    group,
    ranking: ranking || null,
    reviews: groupReviews,
    scamFlags: groupScamFlags.map((f) => ({
      flag: f.flag,
      description: f.description ?? "",
      severity: f.severity,
    })),
    mentions: recentMentions,
    tradeStats,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getGroup(slug);
  if (!data) return { title: "Group Not Found" };

  return {
    title: `${data.group.name} — Signal Group Review`,
    description: data.group.description || `Read reviews and ratings for ${data.group.name} signal group on SignalLeague.`,
  };
}

export default async function GroupProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getGroup(slug);
  if (!data) notFound();

  const { group, ranking, reviews: groupReviews, scamFlags: flags, mentions, tradeStats } = data;
  const platformInfo = PLATFORM_CONFIG[group.platform];
  const tier = ranking?.tier ?? "UNRANKED";
  const avgScore = group.avgScore ? parseFloat(group.avgScore) : 0;
  const transparencyScore = group.transparencyScore ?? null;
  const mentionCount7d = group.twitterMentionCount7d ?? 0;
  const sentimentScore = group.sentimentScore ? parseFloat(group.sentimentScore) : null;

  // Compute average category scores
  const categoryAvgs = {
    signalQuality: 0,
    riskManagement: 0,
    valueForMoney: 0,
    communitySupport: 0,
    transparency: 0,
  };

  if (groupReviews.length > 0) {
    for (const r of groupReviews) {
      categoryAvgs.signalQuality += parseFloat(r.signalQuality);
      categoryAvgs.riskManagement += parseFloat(r.riskManagement);
      categoryAvgs.valueForMoney += parseFloat(r.valueForMoney);
      categoryAvgs.communitySupport += parseFloat(r.communitySupport);
      categoryAvgs.transparency += parseFloat(r.transparency);
    }
    const count = groupReviews.length;
    categoryAvgs.signalQuality /= count;
    categoryAvgs.riskManagement /= count;
    categoryAvgs.valueForMoney /= count;
    categoryAvgs.communitySupport /= count;
    categoryAvgs.transparency /= count;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-8">
            <Link href="/groups" className="hover:text-primary transition-colors">
              Groups
            </Link>
            <span>/</span>
            <span className="text-foreground">{group.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Group Header */}
              <div className="bg-surface-1 border border-border p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h1 className="font-heading text-2xl sm:text-3xl tracking-wider text-foreground">
                      {group.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="text-sm font-mono"
                        style={{ color: platformInfo.color }}
                      >
                        {platformInfo.label}
                      </span>
                      {group.platformHandle && (
                        <span className="text-sm text-muted-foreground font-mono">
                          @{group.platformHandle}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground capitalize">
                        {group.pricingModel}
                        {group.price && ` — $${group.price}`}
                      </span>
                    </div>
                  </div>
                  <TierBadge tier={tier} size="lg" />
                </div>

                {group.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {group.description}
                  </p>
                )}

                {/* Score summary */}
                <div className="flex items-center gap-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-heading text-primary text-glow-primary">
                      {avgScore > 0 ? avgScore.toFixed(1) : "—"}
                    </span>
                    <span className="text-sm text-muted-foreground">/5</span>
                  </div>
                  <div>
                    <StarRating value={avgScore} size="sm" readonly />
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {group.reviewCount} {group.reviewCount === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Radar Chart */}
              {groupReviews.length > 0 && (
                <div className="bg-surface-1 border border-border p-6">
                  <h2 className="font-heading text-sm tracking-wider text-foreground mb-4">
                    Category Breakdown
                  </h2>
                  <RadarChart scores={categoryAvgs} size={280} />
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
                    {(
                      Object.entries(REVIEW_CATEGORIES) as [
                        keyof typeof categoryAvgs,
                        { label: string },
                      ][]
                    ).map(([key, cat]) => (
                      <div key={key} className="text-center">
                        <p className="text-lg font-heading text-primary">
                          {categoryAvgs[key].toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {cat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Track Record */}
              <TrackRecord stats={tradeStats} />

              {/* Reviews */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-sm tracking-wider text-foreground">
                    Reviews ({group.reviewCount})
                  </h2>
                  <Button size="sm" asChild>
                    <Link href={`/groups/${slug}/review`}>Write a Review</Link>
                  </Button>
                </div>

                {groupReviews.length === 0 ? (
                  <div className="bg-surface-1 border border-border p-8 text-center">
                    <p className="text-muted-foreground font-mono text-sm">
                      No reviews yet. Be the first to review this group.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupReviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-surface-1 border border-border p-5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-surface-3 flex items-center justify-center font-heading text-xs text-primary">
                              {review.userName?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-mono text-foreground">
                                {review.userName || "Anonymous"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <StarRating
                            value={parseFloat(review.overallRating)}
                            size="sm"
                            readonly
                          />
                        </div>

                        {review.title && (
                          <h3 className="font-heading text-xs tracking-wider text-foreground">
                            {review.title}
                          </h3>
                        )}

                        {review.body && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {review.body}
                          </p>
                        )}

                        {/* Pros & Cons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                          {review.pros && review.pros.length > 0 && (
                            <div className="flex-1 space-y-1">
                              {review.pros.map((pro, i) => (
                                <p
                                  key={i}
                                  className="text-xs text-primary font-mono"
                                >
                                  + {pro}
                                </p>
                              ))}
                            </div>
                          )}
                          {review.cons && review.cons.length > 0 && (
                            <div className="flex-1 space-y-1">
                              {review.cons.map((con, i) => (
                                <p
                                  key={i}
                                  className="text-xs text-destructive font-mono"
                                >
                                  - {con}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground font-mono">
                            {review.helpfulCount} found this helpful
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Scam Warning */}
              {flags.length > 0 && <ScamWarning flags={flags} />}

              {/* Transparency Score */}
              {transparencyScore !== null && (
                <div className="bg-surface-1 border border-border p-5 space-y-3">
                  <h2 className="font-heading text-xs tracking-wider text-foreground">
                    Transparency Score
                  </h2>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-heading ${
                        transparencyScore >= 70
                          ? "text-primary"
                          : transparencyScore >= 40
                            ? "text-tier-c"
                            : "text-destructive"
                      }`}
                    >
                      {transparencyScore}
                    </span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  <div className="h-2 w-full bg-surface-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        transparencyScore >= 70
                          ? "bg-primary"
                          : transparencyScore >= 40
                            ? "bg-tier-c"
                            : "bg-destructive"
                      }`}
                      style={{ width: `${transparencyScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Transparency Score
                  </p>
                </div>
              )}

              {/* Details */}
              <div className="bg-surface-1 border border-border p-5 space-y-4">
                <h2 className="font-heading text-xs tracking-wider text-foreground">
                  Details
                </h2>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-xs text-muted-foreground">Platform</dt>
                    <dd
                      className="text-xs font-mono"
                      style={{ color: platformInfo.color }}
                    >
                      {platformInfo.label}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-xs text-muted-foreground">Pricing</dt>
                    <dd className="text-xs font-mono text-foreground capitalize">
                      {group.pricingModel}
                      {group.price && ` — $${group.price}`}
                    </dd>
                  </div>
                  {group.estimatedMembers && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-muted-foreground">Members</dt>
                      <dd className="text-xs font-mono text-foreground">
                        ~{group.estimatedMembers.toLocaleString()}
                      </dd>
                    </div>
                  )}
                  {group.foundedAt && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-muted-foreground">Founded</dt>
                      <dd className="text-xs font-mono text-foreground">
                        {new Date(group.foundedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                        })}
                      </dd>
                    </div>
                  )}
                </dl>

                {group.platformUrl && (
                  <a
                    href={group.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center border border-border px-4 py-2 text-xs font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    Visit Group
                  </a>
                )}
              </div>

              {/* Social Proof / Community Buzz */}
              <SocialProof
                mentionCount7d={mentionCount7d}
                sentimentScore={sentimentScore}
                mentions={mentions.map((m) => ({
                  id: m.id,
                  authorHandle: m.authorHandle,
                  content: m.content,
                  sentiment: m.sentiment,
                  engagement: m.engagement,
                  tweetedAt: m.tweetedAt,
                }))}
              />

              {/* Write Review CTA */}
              <div className="bg-surface-2 border border-primary/20 p-5 space-y-3 text-center">
                <p className="text-sm text-foreground font-mono">
                  Have experience with this group?
                </p>
                <Button className="w-full" asChild>
                  <Link href={`/groups/${slug}/review`}>Write a Review</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
