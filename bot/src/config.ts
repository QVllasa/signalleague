/**
 * Bot configuration module.
 * Loads environment variables, validates required ones at startup,
 * and exports a typed config object.
 */

interface BotConfig {
  // Database
  databaseUrl: string;

  // Redis
  redisUrl: string;

  // Twitter API credentials
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessSecret: string;
  twitterBearerToken: string;

  // AI providers
  openaiApiKey: string;
  anthropicApiKey: string;

  // Optional with defaults
  monitorIntervalMs: number;
  schedulerIntervalMs: number;
  logLevel: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

function buildConfig(): BotConfig {
  return {
    // Database
    databaseUrl: requireEnv("DATABASE_URL"),

    // Redis
    redisUrl: optionalEnv("REDIS_URL", "redis://localhost:6379"),

    // Twitter API credentials
    twitterApiKey: requireEnv("TWITTER_BOT_API_KEY"),
    twitterApiSecret: requireEnv("TWITTER_BOT_API_SECRET"),
    twitterAccessToken: requireEnv("TWITTER_BOT_ACCESS_TOKEN"),
    twitterAccessSecret: requireEnv("TWITTER_BOT_ACCESS_SECRET"),
    twitterBearerToken: requireEnv("TWITTER_BOT_BEARER_TOKEN"),

    // AI providers
    openaiApiKey: requireEnv("OPENAI_API_KEY"),
    anthropicApiKey: optionalEnv("ANTHROPIC_API_KEY", ""),

    // Intervals
    monitorIntervalMs: parseInt(
      optionalEnv("MONITOR_INTERVAL_MS", "120000"), // 2 minutes
      10,
    ),
    schedulerIntervalMs: parseInt(
      optionalEnv("SCHEDULER_INTERVAL_MS", "60000"), // 1 minute
      10,
    ),

    // Logging
    logLevel: optionalEnv("LOG_LEVEL", "info"),
  };
}

/** Validated bot configuration singleton. */
export const config = buildConfig();
