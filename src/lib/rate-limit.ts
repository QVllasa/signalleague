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
