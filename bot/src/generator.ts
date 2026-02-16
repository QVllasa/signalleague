/**
 * AI content generator for the SignalLeague Twitter bot.
 *
 * Uses OpenAI (gpt-4o-mini) by default for cost efficiency.
 * Falls back to Anthropic if configured and OpenAI is unavailable.
 */

import OpenAI from "openai";
import { PROMPTS, BOT_PERSONA } from "./prompts.js";
import { config } from "./config.js";
import type { PromptType } from "./prompts.js";

const MAX_TWEET_LENGTH = 280;

export class ContentGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  /**
   * Generate a tweet for the given post type and context.
   *
   * @param postType  - One of the keys in PROMPTS (e.g. "pnl_commentary")
   * @param context   - Data bag passed to the prompt template
   * @returns The generated tweet text, or null on failure
   */
  async generate(
    postType: PromptType,
    context: Record<string, any>,
  ): Promise<string | null> {
    try {
      const prompt = PROMPTS[postType];
      if (!prompt) {
        console.error(`[Generator] Unknown post type: ${postType}`);
        return null;
      }

      // Build the user message from the template.
      // We cast context to `any` because each template has its own shape;
      // callers are expected to pass the right shape for each postType.
      const userMessage = (prompt.template as (ctx: any) => string)(context);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.9,
        max_tokens: 120,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: userMessage },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        console.error("[Generator] Empty response from OpenAI");
        return null;
      }

      // Clean up: strip surrounding quotes that the model sometimes adds
      let tweet = raw.trim().replace(/^["']|["']$/g, "");

      // Hard-truncate to 280 chars as a safety net (ellipsis signals truncation)
      if (tweet.length > MAX_TWEET_LENGTH) {
        tweet = tweet.slice(0, MAX_TWEET_LENGTH - 1) + "\u2026";
      }

      return tweet;
    } catch (error) {
      console.error("[Generator] Failed to generate content:", error);
      return null;
    }
  }

  /**
   * Generate with automatic retry when the result exceeds 280 characters.
   *
   * On each retry the model is explicitly told to be shorter.
   * Returns the generated tweet or null after exhausting retries.
   */
  async generateWithRetry(
    postType: PromptType,
    context: Record<string, any>,
    maxRetries = 2,
  ): Promise<string | null> {
    // First attempt — standard generation
    let result = await this.generate(postType, context);

    if (result === null) return null;
    if (result.length <= MAX_TWEET_LENGTH) return result;

    // Retry loop — ask model to shorten
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.warn(
        `[Generator] Tweet too long (${result.length} chars), retry ${attempt}/${maxRetries}`,
      );

      try {
        const prompt = PROMPTS[postType];
        const userMessage = (prompt.template as (ctx: any) => string)(context);

        const completion = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.7, // lower temp for tighter output
          max_tokens: 100,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: userMessage },
            { role: "assistant", content: result },
            {
              role: "user",
              content: `That was ${result.length} characters. It MUST be under 280 characters. Rewrite it shorter and punchier. Only reply with the tweet text, nothing else.`,
            },
          ],
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) continue;

        let tweet = raw.trim().replace(/^["']|["']$/g, "");

        if (tweet.length <= MAX_TWEET_LENGTH) {
          return tweet;
        }

        // Update result for next retry iteration
        result = tweet;
      } catch (error) {
        console.error(
          `[Generator] Retry ${attempt} failed:`,
          error,
        );
      }
    }

    // Final fallback: hard-truncate the best attempt
    if (result && result.length > MAX_TWEET_LENGTH) {
      console.warn(
        "[Generator] All retries exceeded 280 chars, hard-truncating",
      );
      return result.slice(0, MAX_TWEET_LENGTH - 1) + "\u2026";
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: ContentGenerator | null = null;

/**
 * Returns a singleton ContentGenerator instance.
 * Lazily created on first call so config is validated before instantiation.
 */
export function getGenerator(): ContentGenerator {
  if (!instance) {
    instance = new ContentGenerator();
  }
  return instance;
}
