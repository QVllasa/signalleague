import { db } from "./index";
import {
  users,
  signalGroups,
  reviews,
  tierRankings,
  tags,
  groupTags,
  waitlist,
} from "./schema";
import { calculateGroupTier } from "../lib/ranking";

async function seed() {
  console.log("🌱 Seeding database...");

  // ─── Admin User ───────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@signalleague.com";
  const [adminUser] = await db
    .insert(users)
    .values({
      name: "SignalLeague Admin",
      email: adminEmail,
      role: "admin",
      reputationScore: 100,
    })
    .returning();

  console.log("✓ Admin user created:", adminUser.email);

  // ─── Tags ─────────────────────────────────────────────────────
  const tagData = [
    { name: "Bitcoin", slug: "bitcoin" },
    { name: "Altcoins", slug: "altcoins" },
    { name: "DeFi", slug: "defi" },
    { name: "Futures", slug: "futures" },
    { name: "Spot Trading", slug: "spot-trading" },
    { name: "Swing Trading", slug: "swing-trading" },
    { name: "Day Trading", slug: "day-trading" },
    { name: "Technical Analysis", slug: "technical-analysis" },
    { name: "Fundamental Analysis", slug: "fundamental-analysis" },
    { name: "NFTs", slug: "nfts" },
  ];

  const insertedTags = await db.insert(tags).values(tagData).returning();
  console.log("✓ Tags created:", insertedTags.length);

  // ─── Sample Groups ────────────────────────────────────────────
  const groupData = [
    {
      name: "CryptoAlpha Signals",
      slug: "cryptoalpha-signals",
      description: "Premium crypto signals with detailed analysis. Focus on BTC, ETH and top altcoins. Daily signals with entry, TP and SL levels.",
      platform: "telegram" as const,
      platformHandle: "CryptoAlpha",
      platformUrl: "https://t.me/cryptoalpha",
      pricingModel: "paid" as const,
      price: "49.99",
      estimatedMembers: 12000,
      status: "approved" as const,
      submittedBy: adminUser.id,
    },
    {
      name: "DeFi Degen Alerts",
      slug: "defi-degen-alerts",
      description: "Free community for DeFi opportunities. Early gem calls, yield farming strategies, and airdrop alerts.",
      platform: "discord" as const,
      platformHandle: "DeFiDegenAlerts",
      platformUrl: "https://discord.gg/defidegen",
      pricingModel: "free" as const,
      estimatedMembers: 45000,
      status: "approved" as const,
      submittedBy: adminUser.id,
    },
    {
      name: "Whale Watchers",
      slug: "whale-watchers",
      description: "On-chain analysis and whale movement tracking. Real-time alerts when large wallets make moves.",
      platform: "twitter" as const,
      platformHandle: "WhaleWatchersCT",
      platformUrl: "https://twitter.com/WhaleWatchersCT",
      pricingModel: "freemium" as const,
      price: "29.99",
      estimatedMembers: 8500,
      status: "approved" as const,
      submittedBy: adminUser.id,
    },
    {
      name: "Futures Pro Signals",
      slug: "futures-pro-signals",
      description: "Professional leverage trading signals. Focus on BTC and ETH perpetual futures with risk management.",
      platform: "telegram" as const,
      platformHandle: "FuturesProSignals",
      platformUrl: "https://t.me/futurespro",
      pricingModel: "paid" as const,
      price: "99.99",
      estimatedMembers: 3200,
      status: "approved" as const,
      submittedBy: adminUser.id,
    },
    {
      name: "Altcoin Season Hub",
      slug: "altcoin-season-hub",
      description: "Catching altcoin pumps before they happen. Community-driven research and signal sharing.",
      platform: "discord" as const,
      platformHandle: "AltcoinSeasonHub",
      platformUrl: "https://discord.gg/altseason",
      pricingModel: "free" as const,
      estimatedMembers: 28000,
      status: "approved" as const,
      submittedBy: adminUser.id,
    },
    {
      name: "PendingGroup TestSignals",
      slug: "pending-test-signals",
      description: "This group is pending approval to test admin moderation.",
      platform: "twitter" as const,
      platformHandle: "PendingTest",
      platformUrl: "https://twitter.com/pendingtest",
      pricingModel: "free" as const,
      status: "pending" as const,
      submittedBy: adminUser.id,
    },
  ];

  const insertedGroups = await db
    .insert(signalGroups)
    .values(groupData)
    .returning();
  console.log("✓ Signal groups created:", insertedGroups.length);

  // ─── Sample Test Users ────────────────────────────────────────
  const testUsers = await db
    .insert(users)
    .values([
      { name: "CryptoTrader99", email: "trader99@test.com", reputationScore: 15 },
      { name: "DeFi_Dave", email: "dave@test.com", reputationScore: 25 },
      { name: "AltcoinAnna", email: "anna@test.com", reputationScore: 10 },
      { name: "BTCMaxi", email: "maxi@test.com", reputationScore: 30 },
    ])
    .returning();

  console.log("✓ Test users created:", testUsers.length);

  // ─── Sample Reviews ───────────────────────────────────────────
  const approvedGroups = insertedGroups.filter((g) => g.status === "approved");

  const reviewData = [];
  for (const group of approvedGroups) {
    for (const user of testUsers) {
      const base = 2.5 + Math.random() * 2.5;
      reviewData.push({
        userId: user.id,
        groupId: group.id,
        overallRating: (Math.round(base * 2) / 2).toFixed(1),
        signalQuality: (Math.round((base + (Math.random() - 0.5)) * 2) / 2).toFixed(1),
        riskManagement: (Math.round((base + (Math.random() - 0.5)) * 2) / 2).toFixed(1),
        valueForMoney: (Math.round((base + (Math.random() - 0.5)) * 2) / 2).toFixed(1),
        communitySupport: (Math.round((base + (Math.random() - 0.5)) * 2) / 2).toFixed(1),
        transparency: (Math.round((base + (Math.random() - 0.5)) * 2) / 2).toFixed(1),
        title: `Review of ${group.name}`,
        body: `I've been following ${group.name} for a while now. Overall the experience has been ${base > 3.5 ? "positive" : "mixed"} with ${base > 3.5 ? "consistent" : "some hit-or-miss"} signals.`,
        membershipDuration: ["less_than_1_month", "1_to_3_months", "3_to_6_months", "6_to_12_months", "over_1_year"][
          Math.floor(Math.random() * 5)
        ] as "less_than_1_month" | "1_to_3_months" | "3_to_6_months" | "6_to_12_months" | "over_1_year",
        pros: base > 3.5 ? ["Good signals", "Active community"] : ["Some good calls"],
        cons: base > 3.5 ? ["Expensive"] : ["Inconsistent", "Poor risk management"],
      });
    }
  }

  await db.insert(reviews).values(reviewData);
  console.log("✓ Reviews created:", reviewData.length);

  // ─── Update Group Stats ───────────────────────────────────────
  for (const group of approvedGroups) {
    const groupReviews = reviewData.filter((r) => r.groupId === group.id);
    const avgScore =
      groupReviews.reduce((sum, r) => sum + parseFloat(r.overallRating), 0) /
      groupReviews.length;

    await db.execute(
      `UPDATE signal_groups SET avg_score = '${avgScore.toFixed(1)}', review_count = ${groupReviews.length} WHERE id = '${group.id}'`
    );
  }

  console.log("✓ Group stats updated");

  // ─── Calculate Tiers ──────────────────────────────────────────
  for (const group of approvedGroups) {
    const result = await calculateGroupTier(group.id);
    console.log(`  → ${group.name}: Tier ${result.tier} (Score: ${result.score})`);
  }
  console.log("✓ Tier rankings calculated");

  // ─── Assign Tags to Groups ────────────────────────────────────
  const tagAssignments = [
    { groupSlug: "cryptoalpha-signals", tagSlugs: ["bitcoin", "altcoins", "technical-analysis"] },
    { groupSlug: "defi-degen-alerts", tagSlugs: ["defi", "altcoins", "nfts"] },
    { groupSlug: "whale-watchers", tagSlugs: ["bitcoin", "fundamental-analysis"] },
    { groupSlug: "futures-pro-signals", tagSlugs: ["futures", "day-trading", "bitcoin"] },
    { groupSlug: "altcoin-season-hub", tagSlugs: ["altcoins", "swing-trading", "spot-trading"] },
  ];

  for (const assignment of tagAssignments) {
    const group = insertedGroups.find((g) => g.slug === assignment.groupSlug);
    if (!group) continue;

    for (const tagSlug of assignment.tagSlugs) {
      const tag = insertedTags.find((t) => t.slug === tagSlug);
      if (!tag) continue;
      await db.insert(groupTags).values({ groupId: group.id, tagId: tag.id });
    }
  }
  console.log("✓ Tags assigned to groups");

  // ─── Sample Waitlist Entries ──────────────────────────────────
  await db.insert(waitlist).values([
    { email: "early@adopter.com", referralCode: "SL-EARLY1", position: 1 },
    { email: "crypto@fan.com", referralCode: "SL-CRYPTO", referredBy: "SL-EARLY1", position: 2 },
    { email: "signal@seeker.com", referralCode: "SL-SIGNAL", position: 3 },
  ]);
  console.log("✓ Waitlist entries created");

  console.log("\n🎉 Seed complete!");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
