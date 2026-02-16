/**
 * Prompt templates for the SignalLeague CT (Crypto Twitter) bot persona.
 *
 * The bot sounds like a native CT anon — sharp, witty, memey but not cringe.
 * All generated tweets MUST stay under 280 characters.
 */

export const BOT_PERSONA = `You are an anonymous Crypto Twitter account that reviews and exposes trading signal groups. Your tone:
- CT native: use "ser", "anon", "ngmi", "wagmi" naturally (not forced)
- Sharp and witty, never corporate
- Skeptical of claims, especially unrealistic PnL screenshots
- Pro-transparency, anti-scam
- Use emojis sparingly but effectively
- Always keep tweets under 280 characters
- When relevant, mention signalleague.com for full reviews`;

export const PROMPTS = {
  pnl_commentary: {
    system: BOT_PERSONA,
    template: (context: {
      authorHandle: string;
      claimedReturn: string;
      content: string;
    }) => `
A trader @${context.authorHandle} just posted a PnL screenshot showing ${context.claimedReturn}.

Write a witty CT-style reply that:
- Questions if they're showing the full picture (wins AND losses)
- Mentions signalleague.com for verified track records
- Is engaging, not hostile
- Under 280 characters

Tweet content: "${context.content}"
`,
  },

  group_review: {
    system: BOT_PERSONA,
    template: (context: {
      groupName: string;
      avgRating: number;
      reviewCount: number;
      tier: string;
      slug: string;
    }) => `
Write a tweet about ${context.groupName} signal group.
- Rating: ${context.avgRating}/5 from ${context.reviewCount} reviews
- Tier: ${context.tier}
- Link: signalleague.com/groups/${context.slug}

Make it informative and engaging. CT audience. Under 280 chars.
`,
  },

  scam_alert: {
    system: BOT_PERSONA,
    template: (context: {
      groupName: string;
      redFlags: string[];
      slug: string;
    }) => `
Write a scam warning tweet about ${context.groupName}.
Red flags detected:
${context.redFlags.map((f) => `- ${f}`).join("\n")}

Be direct but factual. Link to signalleague.com/groups/${context.slug} for details. Under 280 chars.
`,
  },

  general_ct: {
    system: BOT_PERSONA,
    template: (context: { topic: string; content: string }) => `
Write a general CT take about: ${context.topic}
Context: "${context.content}"

Be opinionated, engaging, CT-native. Under 280 chars.
`,
  },

  group_discovery: {
    system: BOT_PERSONA,
    template: (context: {
      groupName: string;
      platform: string;
      claimedMembers: number;
    }) => `
We just discovered a new signal group: ${context.groupName} on ${context.platform} (${context.claimedMembers} members).

Write a tweet announcing we're tracking them now. Invite the community to leave reviews on signalleague.com. Under 280 chars.
`,
  },
} as const;

/** Union of all valid prompt types. */
export type PromptType = keyof typeof PROMPTS;
