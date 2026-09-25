/**
 * SignalLeague Bot — Integration Test (Dry Run)
 *
 * Tests the full pipeline without posting to Twitter.
 * Run: npx tsx src/test-pipeline.ts
 */

import "dotenv/config";
import { config } from "./config.js";
import { PROMPTS, BOT_PERSONA } from "./prompts.js";
import {
  classifyTweet,
  extractGroupLinks,
  determineSentiment,
} from "./monitor.js";

async function testConfig() {
  console.log("\n=== 1. Config Check ===");
  console.log("DATABASE_URL:", config.databaseUrl ? "SET" : "MISSING");
  console.log("REDIS_URL:", config.redisUrl ? "SET" : "MISSING");
  console.log("TWITTER_BOT_BEARER_TOKEN:", config.twitterBearerToken ? "SET" : "MISSING");
  console.log("OPENAI_API_KEY:", config.openaiApiKey ? "SET" : "MISSING");
  console.log("ANTHROPIC_API_KEY:", config.anthropicApiKey ? "SET" : "MISSING");

  const hasAiKey = config.openaiApiKey || config.anthropicApiKey;
  console.log("\nAI Provider:", hasAiKey ? "CONFIGURED" : "MISSING (bot won't generate content)");
  console.log("Twitter:", config.twitterBearerToken ? "CONFIGURED" : "MISSING (bot won't post)");
}

async function testClassification() {
  console.log("\n=== 2. Tweet Classification ===");

  const testTweets = [
    {
      text: "Just made $5000 profit on BTC! 🚀 PnL screenshot attached. Join my VIP signal group for more gains!",
      expected: "group_promo",
    },
    {
      text: "Another green day! +15% ROI on today's trades. My PnL speaks for itself 📈",
      expected: "pnl_post",
    },
    {
      text: "WARNING: @FakeTrader is a scam! They rug pulled their signal group members. Lost $2000",
      expected: "scam_report",
    },
    {
      text: "Bitcoin looking bullish above 100k. Next target 120k.",
      expected: "general",
    },
    {
      text: "Good morning everyone ☀️ hope you have a great day",
      expected: "irrelevant",
    },
    {
      text: "Free signals group! Join now: t.me/cryptosignals - 90% win rate guaranteed!",
      expected: "group_promo",
    },
  ];

  for (const [i, test] of testTweets.entries()) {
    const result = classifyTweet({ id: `test-${i}`, text: test.text });
    const pass = result.type === test.expected;
    console.log(`${pass ? "✅" : "❌"} "${test.text.slice(0, 60)}..." → ${result.type} (expected: ${test.expected})`);
  }
}

async function testLinkExtraction() {
  console.log("\n=== 3. Group Link Extraction ===");

  const testTexts = [
    "Join our group: t.me/cryptoalpha for free signals!",
    "Best discord server: discord.gg/tradingpro",
    "Check us out on https://whop.com/crypto-signals/",
    "No links here, just vibes",
    "Multiple: t.me/group1 and discord.gg/group2",
  ];

  for (const text of testTexts) {
    const links = extractGroupLinks(text);
    console.log(`"${text.slice(0, 50)}..." → ${links.length} links found:`, links.map((l) => `${l.platform}:${l.url}`).join(", ") || "(none)");
  }
}

async function testSentiment() {
  console.log("\n=== 4. Sentiment Analysis ===");

  const testTexts = [
    { text: "Amazing signals, made great profit! Best group ever!", expected: "positive" },
    { text: "Total scam, lost all my money. Fake screenshots.", expected: "negative" },
    { text: "Just joined this trading group yesterday", expected: "neutral" },
    { text: "These signals are fire 🔥 moon soon wagmi", expected: "positive" },
    { text: "Rugged again, these frauds need to be exposed", expected: "negative" },
  ];

  for (const test of testTexts) {
    const result = determineSentiment(test.text);
    const pass = result === test.expected;
    console.log(`${pass ? "✅" : "❌"} "${test.text.slice(0, 50)}..." → ${result} (expected: ${test.expected})`);
  }
}

async function testPromptTemplates() {
  console.log("\n=== 5. Prompt Template Generation ===");

  const pnlPrompt = PROMPTS.pnl_commentary.template({
    authorHandle: "CryptoGuru",
    claimedReturn: "+500% in one day",
    content: "Look at my insane PnL! Join my group for more!",
  });
  console.log("PnL Commentary prompt:", pnlPrompt.slice(0, 100), "...");

  const reviewPrompt = PROMPTS.group_review.template({
    groupName: "CryptoAlpha Signals",
    avgRating: 4.2,
    reviewCount: 15,
    tier: "A",
    slug: "cryptoalpha-signals",
  });
  console.log("Group Review prompt:", reviewPrompt.slice(0, 100), "...");

  const scamPrompt = PROMPTS.scam_alert.template({
    groupName: "ShadySignals",
    redFlags: ["Only shows winners", "Account < 3 months old", "5 scam reports"],
    slug: "shady-signals",
  });
  console.log("Scam Alert prompt:", scamPrompt.slice(0, 100), "...");

  console.log("\nAll prompt templates generate valid strings ✅");
}

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  SignalLeague Bot — Integration Test (Dry)   ║");
  console.log("╚══════════════════════════════════════════════╝");

  await testConfig();
  await testClassification();
  await testLinkExtraction();
  await testSentiment();
  await testPromptTemplates();

  console.log("\n══════════════════════════════════════════════");
  console.log("Test complete. No tweets were posted.");
  console.log("To run the full bot: npm run dev");
  console.log("══════════════════════════════════════════════\n");
}

main().catch(console.error);
