/**
 * Database client for the SignalLeague bot.
 * Connects to the shared PostgreSQL instance using pg Pool
 * and exposes simplified query helpers for bot operations.
 */

import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

let pool: pg.Pool;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function initDb(): Promise<void> {
  pool = new Pool({
    connectionString: config.databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Verify connection
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Generic query helper
// ---------------------------------------------------------------------------

export async function query<T extends pg.QueryResultRow = any>(
  sql: string,
  params?: any[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(sql, params);
}

// ---------------------------------------------------------------------------
// Signal Groups
// ---------------------------------------------------------------------------

export interface SignalGroup {
  id: string;
  name: string;
  slug: string;
  status: string;
  [key: string]: any;
}

export async function getApprovedGroups(): Promise<SignalGroup[]> {
  const result = await query<SignalGroup>(
    "SELECT * FROM signal_groups WHERE status = 'approved'",
  );
  return result.rows;
}

export async function insertDiscoveredGroup(group: {
  name: string;
  slug: string;
  description?: string;
  source_url?: string;
}): Promise<void> {
  await query(
    `INSERT INTO signal_groups (name, slug, description, source_url, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())
     ON CONFLICT (slug) DO NOTHING`,
    [group.name, group.slug, group.description ?? null, group.source_url ?? null],
  );
}

// ---------------------------------------------------------------------------
// Bot Config
// ---------------------------------------------------------------------------

export interface BotConfigRow {
  id: string;
  key: string;
  value: string;
  [k: string]: any;
}

export async function getBotConfig(): Promise<BotConfigRow[]> {
  const result = await query<BotConfigRow>("SELECT * FROM bot_config");
  return result.rows;
}

// ---------------------------------------------------------------------------
// Bot Queue
// ---------------------------------------------------------------------------

export interface BotQueueItem {
  action_type: string;
  payload: Record<string, any>;
  scheduled_for?: Date;
  priority?: number;
}

export async function insertBotQueueItem(item: BotQueueItem): Promise<string> {
  const result = await query(
    `INSERT INTO bot_queue (action_type, payload, scheduled_for, priority, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())
     RETURNING id`,
    [
      item.action_type,
      JSON.stringify(item.payload),
      item.scheduled_for ?? new Date(),
      item.priority ?? 0,
    ],
  );
  return result.rows[0].id;
}

export async function updateBotQueueStatus(
  id: string,
  status: "pending" | "processing" | "completed" | "failed",
  extras?: { error_message?: string; result?: Record<string, any> },
): Promise<void> {
  const setClauses = ["status = $2", "updated_at = NOW()"];
  const params: any[] = [id, status];

  if (extras?.error_message) {
    setClauses.push(`error_message = $${params.length + 1}`);
    params.push(extras.error_message);
  }

  if (extras?.result) {
    setClauses.push(`result = $${params.length + 1}`);
    params.push(JSON.stringify(extras.result));
  }

  if (status === "completed" || status === "failed") {
    setClauses.push("processed_at = NOW()");
  }

  await query(`UPDATE bot_queue SET ${setClauses.join(", ")} WHERE id = $1`, params);
}

// ---------------------------------------------------------------------------
// Twitter Mentions
// ---------------------------------------------------------------------------

export interface TwitterMention {
  tweet_id: string;
  author_id: string;
  author_username: string;
  text: string;
  intent?: string;
  entities?: Record<string, any>;
  created_at?: Date;
}

export async function insertTwitterMention(mention: TwitterMention): Promise<void> {
  await query(
    `INSERT INTO twitter_mentions (tweet_id, author_id, author_username, text, intent, entities, tweet_created_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (tweet_id) DO NOTHING`,
    [
      mention.tweet_id,
      mention.author_id,
      mention.author_username,
      mention.text,
      mention.intent ?? null,
      mention.entities ? JSON.stringify(mention.entities) : null,
      mention.created_at ?? new Date(),
    ],
  );
}

export async function checkTweetProcessed(tweetId: string): Promise<boolean> {
  const result = await query(
    "SELECT 1 FROM twitter_mentions WHERE tweet_id = $1 LIMIT 1",
    [tweetId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}
