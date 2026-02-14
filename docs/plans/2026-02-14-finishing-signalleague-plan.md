# SignalLeague — Fix & Ship Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make SignalLeague fully runnable locally, fix all bugs found during testing, harden the codebase, and prepare for deployment.

**Architecture:** Bottom-up approach: start Docker services, initialize DB/search, start dev server, test every page in the browser, fix issues, add hardening features, commit everything. No new features — only fixes and polish.

**Tech Stack:** Next.js 16.1, PostgreSQL 17, MeiliSearch, Redis, MinIO, Drizzle ORM, Auth.js v5

---

### Task 1: Commit existing uncommitted changes

**Files:**
- Modified: `docker-compose.yml` (Plausible image pinned to v2.1)
- Modified: `src/middleware.ts` (added `export const runtime = "nodejs"`)
- Modified: `package.json` (`@types/react` pinned to 19.2.13)
- Modified: `package-lock.json` (lockfile update)

**Step 1: Stage and commit the 4 modified files**

Run:
```bash
git add docker-compose.yml src/middleware.ts package.json package-lock.json
git commit -m "chore: pin Plausible to v2.1, pin @types/react, set middleware runtime to nodejs"
```
Expected: Clean commit, `git status` shows nothing modified.

---

### Task 2: Start Docker backend services

**Step 1: Start only DB, Redis, MeiliSearch, MinIO (skip Plausible stack)**

Run:
```bash
docker compose up -d db search redis minio
```
Expected: 4 containers running.

**Step 2: Verify all services are healthy**

Run:
```bash
docker compose ps
```
Expected: All 4 containers show status "healthy" or "Up".

**Step 3: Verify PostgreSQL connection**

Run:
```bash
docker compose exec db psql -U signalleague -c "SELECT 1;"
```
Expected: Returns `1`.

**Step 4: Verify MeiliSearch is reachable**

Run:
```bash
curl -s http://localhost:7700/health
```
Expected: `{"status":"available"}`

**Step 5: Verify Redis is reachable**

Run:
```bash
docker compose exec redis redis-cli ping
```
Expected: `PONG`

---

### Task 3: Initialize database with schema and seed data

**Step 1: Push Drizzle schema to PostgreSQL**

Run:
```bash
npx drizzle-kit push
```
Expected: All 14 tables created (users, accounts, sessions, verificationTokens, signalGroups, reviews, tierRankings, tierHistory, waitlist, tags, groupTags, reviewVotes, reports, bookmarks).

**Step 2: Run seed script**

Run:
```bash
npm run db:seed
```
Expected: Output shows:
- Admin user created
- 10 tags created
- 6 signal groups created (5 approved, 1 pending)
- 4 test users created
- 20 reviews created
- Group stats updated
- Tier rankings calculated
- Tags assigned
- 3 waitlist entries created

**Step 3: Verify data in database**

Run:
```bash
docker compose exec db psql -U signalleague -c "SELECT name, status, avg_score, review_count FROM signal_groups ORDER BY name;"
```
Expected: 6 rows with scores and review counts for approved groups.

---

### Task 4: Initialize MeiliSearch index

**Step 1: Start dev server briefly or use curl to call sync endpoint**

Run:
```bash
curl -X POST http://localhost:3000/api/search/sync \
  -H "Authorization: Bearer dev-cron-secret-change-in-production"
```
Note: This requires the dev server running. Alternative: we can do this after Task 5.

---

### Task 5: Start dev server and verify it loads

**Step 1: Start the Next.js dev server**

Run:
```bash
npm run dev
```
Expected: Server starts on http://localhost:3000, Turbopack compiles successfully.

**Step 2: Sync MeiliSearch (if not done in Task 4)**

Run:
```bash
curl -X POST http://localhost:3000/api/search/sync \
  -H "Authorization: Bearer dev-cron-secret-change-in-production"
```
Expected: `{"success": true, "synced": 6}`

---

### Task 6: Test all public pages in browser

Open each page in the browser and check for:
- Page renders without errors
- Console has no errors
- Data from DB is displayed correctly
- Design system is consistent (fonts, colors, effects)
- Links work
- Responsive layout (check mobile too)

**Pages to test:**
1. `http://localhost:3000/` — Landing page (hero, features, waitlist form)
2. `http://localhost:3000/groups` — Groups directory (should show 5 approved groups)
3. `http://localhost:3000/groups/cryptoalpha-signals` — Group detail page
4. `http://localhost:3000/groups/defi-degen-alerts` — Another group detail
5. `http://localhost:3000/leaderboard` — Ranked list of groups by tier
6. `http://localhost:3000/login` — Login page (OAuth buttons, no real auth)
7. `http://localhost:3000/robots.txt` — Should return valid robots.txt
8. `http://localhost:3000/sitemap.xml` — Should return valid XML sitemap
9. `http://localhost:3000/nonexistent-page` — Should show custom 404

**Document any bugs found** — fix them in Tasks 7+.

---

### Task 7: Test protected pages (code review)

Since we can't log in without OAuth credentials, review these pages at the code level:

**Files to review:**
- `src/app/dashboard/page.tsx` — Verify auth check, data queries, UI
- `src/app/admin/page.tsx` — Admin overview stats
- `src/app/admin/groups/page.tsx` — Group management table + actions
- `src/app/admin/reviews/page.tsx` — Review moderation
- `src/app/admin/users/page.tsx` — User role management
- `src/app/admin/reports/page.tsx` — Report handling
- `src/app/admin/waitlist/page.tsx` — Waitlist management
- `src/app/groups/submit/page.tsx` — Group submission form
- `src/app/groups/[slug]/review/page.tsx` — Review submission form

**Check for:**
- Auth guards (redirect if not logged in)
- Admin role checks on admin pages
- Form validation with Zod
- Error handling on DB queries
- Proper revalidation after mutations

---

### Task 8: Fix MinIO public URL hardcoding

**Files:**
- Modify: `src/lib/minio.ts:46-48`
- Modify: `.env` and `.env.example`

**Step 1: Add new env variable to .env and .env.example**

Add to both files:
```
NEXT_PUBLIC_MINIO_URL=http://localhost:9000
```

**Step 2: Update getPublicUrl in minio.ts**

Change `src/lib/minio.ts:46-48` from:
```typescript
export function getPublicUrl(key: string) {
  return `http://${process.env.MINIO_ENDPOINT || "localhost"}:${process.env.MINIO_PORT || "9000"}/${BUCKET}/${key}`;
}
```
To:
```typescript
export function getPublicUrl(key: string) {
  const baseUrl = process.env.NEXT_PUBLIC_MINIO_URL || `http://${process.env.MINIO_ENDPOINT || "localhost"}:${process.env.MINIO_PORT || "9000"}`;
  return `${baseUrl}/${BUCKET}/${key}`;
}
```

**Step 3: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

---

### Task 9: Fix Redis lazy connection

**Files:**
- Modify: `src/lib/redis.ts`

**Step 1: Remove lazyConnect and add graceful error handling**

Change `src/lib/redis.ts` from:
```typescript
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
```
To:
```typescript
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
```

**Step 2: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

---

### Task 10: Add Brevo email retry logic

**Files:**
- Modify: `src/lib/brevo.ts:11-38`

**Step 1: Add retry wrapper to sendEmail**

Change the `sendEmail` function in `src/lib/brevo.ts` to:
```typescript
export async function sendEmail({
  to,
  subject,
  htmlContent,
  sender = { name: "SignalLeague", email: "noreply@signalleague.com" },
}: SendEmailParams) {
  if (!BREVO_API_KEY) {
    console.warn("[Brevo] No API key configured, skipping email send");
    return null;
  }

  const doSend = async () => {
    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sender, to, subject, htmlContent }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${response.status} - ${error}`);
    }

    return response.json();
  };

  try {
    return await doSend();
  } catch (err) {
    console.warn("[Brevo] First attempt failed, retrying in 2s...", (err as Error).message);
    await new Promise((r) => setTimeout(r, 2000));
    try {
      return await doSend();
    } catch (retryErr) {
      console.error("[Brevo] Retry failed:", (retryErr as Error).message);
      return null;
    }
  }
}
```

**Step 2: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

---

### Task 11: Make seed admin email configurable

**Files:**
- Modify: `src/db/seed.ts:19-24`
- Modify: `.env` and `.env.example`

**Step 1: Add ADMIN_EMAIL to .env and .env.example**

Add to both files:
```
ADMIN_EMAIL=admin@signalleague.com
```

**Step 2: Update seed script to use env variable**

Change `src/db/seed.ts:17-25` from:
```typescript
  const [adminUser] = await db
    .insert(users)
    .values({
      name: "SignalLeague Admin",
      email: "admin@signalleague.com",
      role: "admin",
      reputationScore: 100,
    })
    .returning();
```
To:
```typescript
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
```

---

### Task 12: Add rate limiting utility

**Files:**
- Create: `src/lib/rate-limit.ts`

**Step 1: Create Redis-based rate limiter**

Create `src/lib/rate-limit.ts`:
```typescript
import { redis } from "@/lib/redis";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redisKey = `rate-limit:${key}`;

  try {
    const current = await redis.incr(redisKey);

    if (current === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const ttl = await redis.ttl(redisKey);

    return {
      success: current <= limit,
      remaining: Math.max(0, limit - current),
      reset: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    // If Redis is down, allow the request
    console.warn("[RateLimit] Redis unavailable, allowing request");
    return { success: true, remaining: limit, reset: windowSeconds };
  }
}
```

**Step 2: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

---

### Task 13: Apply rate limiting to public API endpoints

**Files:**
- Modify: `src/app/api/cron/recalculate-tiers/route.ts`
- Modify: `src/app/api/search/sync/route.ts`

Note: These endpoints already have CRON_SECRET auth. Rate limiting is a second layer of defense. We apply it to prevent brute-force attempts on the secret.

**Step 1: Add rate limiting to cron endpoint**

Add at the top of the POST handler:
```typescript
import { rateLimit } from "@/lib/rate-limit";

// Inside the POST handler, before auth check:
const { success } = await rateLimit("cron:recalculate", 10, 60);
if (!success) {
  return Response.json({ error: "Too many requests" }, { status: 429 });
}
```

**Step 2: Add rate limiting to search sync endpoint**

Same pattern for the search sync endpoint.

**Step 3: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

---

### Task 14: Fix turbopack.root warning in next.config.ts

**Files:**
- Modify: `next.config.ts`

**Step 1: Add turbopack root configuration**

Change `next.config.ts` from:
```typescript
const nextConfig: NextConfig = {
  output: "standalone",
```
To:
```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: ".",
  },
```

**Step 2: Verify build still passes and warning is gone**

Run: `npm run build`
Expected: Build succeeds without workspace root warning.

---

### Task 15: Commit all code fixes

**Step 1: Stage all modified and new files**

Run:
```bash
git add src/lib/minio.ts src/lib/redis.ts src/lib/brevo.ts src/db/seed.ts \
  src/lib/rate-limit.ts src/app/api/cron/recalculate-tiers/route.ts \
  src/app/api/search/sync/route.ts next.config.ts .env.example
```

**Step 2: Commit**

Run:
```bash
git commit -m "fix: harden codebase — MinIO URL config, Redis retry, Brevo retry, rate limiting, turbopack root"
```

---

### Task 16: Fix any bugs found during browser testing (Task 6)

This is a dynamic task — fix whatever bugs were documented during Task 6.

**Step 1: Fix each bug**
**Step 2: Verify the fix in browser**
**Step 3: Commit**

Run:
```bash
git add -A
git commit -m "fix: resolve bugs found during browser testing"
```

---

### Task 17: Final validation

**Step 1: Run build**

Run:
```bash
npm run build
```
Expected: Build succeeds, no errors, no new warnings.

**Step 2: Run lint**

Run:
```bash
npm run lint
```
Expected: No linting errors.

**Step 3: Restart Docker services clean**

Run:
```bash
docker compose down
docker compose up -d db search redis minio
```

**Step 4: Re-push schema and re-seed**

Run:
```bash
npx drizzle-kit push
npm run db:seed
```

**Step 5: Start dev server and do final smoke test**

Run:
```bash
npm run dev
```

Visit all pages one more time, verify everything works.

**Step 6: Final commit if any remaining changes**

Run:
```bash
git status
```

If clean: done. If changes: stage, commit, done.
