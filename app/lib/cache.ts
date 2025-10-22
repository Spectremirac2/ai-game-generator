import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const CACHE_KEYS = {
  GAME_CODE: "game:code:",
  ASSETS: "game:assets:",
  USER_GENERATION: "user:gen:",
  RATE_LIMIT: "ratelimit:",
} as const;

export const CACHE_TTL = {
  GAME_CODE: 60 * 60 * 24, // 24 hours
  ASSETS: 60 * 60 * 24 * 7, // 7 days
  USER_GENERATION: 60, // 1 minute
  RATE_LIMIT: 60 * 60, // 1 hour
} as const;

function hashInput(input: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  let hash = 0;
  for (let i = 0; i < data.length; i += 1) {
    hash = (hash << 5) - hash + data[i];
    hash |= 0; // Convert to 32bit integer
  }
  const buffer = new Uint8Array([
    (hash >>> 24) & 0xff,
    (hash >>> 16) & 0xff,
    (hash >>> 8) & 0xff,
    hash & 0xff,
  ]);
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(buffer).toString("base64url")
      : btoa((() => {
          let result = "";
          for (let i = 0; i < buffer.length; i += 1) {
            result += String.fromCharCode(buffer[i]);
          }
          return result;
        })())
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
  return base64.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
}

export function generateCacheKey(prefix: string, input: string): string {
  return `${prefix}${hashInput(input)}`;
}

export async function cacheGameCode(prompt: string, template: string, gameData: unknown) {
  const key = generateCacheKey(CACHE_KEYS.GAME_CODE, `${template}:${prompt}`);
  console.log("[cache] set game code", key);
  await redis.set(key, JSON.stringify(gameData), { ex: CACHE_TTL.GAME_CODE });
}

export async function getCachedGameCode<T>(
  prompt: string,
  template: string
): Promise<T | null> {
  const key = generateCacheKey(CACHE_KEYS.GAME_CODE, `${template}:${prompt}`);
  const cached = await redis.get<string>(key);
  console.log("[cache] get game code", key, cached ? "hit" : "miss");
  return cached ? (JSON.parse(cached) as T) : null;
}

export async function cacheAssets(assetKey: string, assets: unknown) {
  const key = generateCacheKey(CACHE_KEYS.ASSETS, assetKey);
  console.log("[cache] set assets", key);
  await redis.set(key, JSON.stringify(assets), { ex: CACHE_TTL.ASSETS });
}

export async function getCachedAssets<T>(assetKey: string): Promise<T | null> {
  const key = generateCacheKey(CACHE_KEYS.ASSETS, assetKey);
  const cached = await redis.get<string>(key);
  console.log("[cache] get assets", key, cached ? "hit" : "miss");
  return cached ? (JSON.parse(cached) as T) : null;
}

export async function checkRateLimit(
  identifier: string,
  limit = 10
): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  const key = generateCacheKey(CACHE_KEYS.RATE_LIMIT, identifier);
  const rawCurrent = await redis.get<number>(key);
  const current = typeof rawCurrent === "number" ? rawCurrent : Number(rawCurrent ?? 0);

  if (!rawCurrent) {
    await redis.set(key, 1, { ex: CACHE_TTL.RATE_LIMIT });
    console.log("[rate-limit] new key", key);
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      reset: new Date(Date.now() + CACHE_TTL.RATE_LIMIT * 1000),
    };
  }

  if (current >= limit) {
    const ttl = await redis.ttl(key);
    console.log("[rate-limit] blocked", key);
    return {
      allowed: false,
      remaining: 0,
      reset: new Date(Date.now() + Math.max(0, ttl) * 1000),
    };
  }

  const updated = await redis.incr(key);
  const ttl = await redis.ttl(key);
  console.log("[rate-limit] increment", key, updated);
  return {
    allowed: true,
    remaining: Math.max(0, limit - updated),
    reset: new Date(Date.now() + Math.max(0, ttl) * 1000),
  };
}

export async function batchGetCache<T>(keys: string[]): Promise<Array<T | null>> {
  const pipeline = redis.pipeline();
  keys.forEach((key) => pipeline.get<string>(key));
  const results = (await pipeline.exec()) as Array<string | null>;
  return results.map((value) => (value ? (JSON.parse(value) as T) : null));
}

export async function getCacheStats(): Promise<{
  totalKeys: number;
  memoryUsage: number;
  hitRate: number;
}> {
  try {
    const redisWithInfo = redis as unknown as { info?: () => Promise<string> };
    const info = await redisWithInfo.info?.();
    if (!info) {
      console.warn("[cache] info command not supported by current Redis client");
      return { totalKeys: 0, memoryUsage: 0, hitRate: 0 };
    }

    const lines = info.split("\n");
    let totalKeys = 0;
    let memoryUsage = 0;
    let hitRate = 0;
    let hits = 0;
    let misses = 0;

    for (const line of lines) {
      if (line.startsWith("db0:")) {
        const matches = line.match(/keys=(\d+)/);
        if (matches) {
          totalKeys = Number(matches[1]);
        }
      } else if (line.startsWith("used_memory:")) {
        memoryUsage = Number(line.split(":")[1]);
      } else if (line.startsWith("keyspace_hits:")) {
        hits = Number(line.split(":")[1]);
      } else if (line.startsWith("keyspace_misses:")) {
        misses = Number(line.split(":")[1]);
      }
    }

    const totalLookups = hits + misses;
    if (totalLookups > 0) {
      hitRate = hits / totalLookups;
    }

    console.log("[cache] stats", { totalKeys, memoryUsage, hitRate });
    return { totalKeys, memoryUsage, hitRate };
  } catch (error) {
    console.error("[cache] stats error", error);
    return { totalKeys: 0, memoryUsage: 0, hitRate: 0 };
  }
}

export async function clearCache(pattern?: string): Promise<number> {
  if (!pattern) {
    console.warn("[cache] flushdb called");
    await redis.flushdb();
    return 0;
  }

  const keys = await redis.keys(pattern);
  if (keys.length === 0) {
    return 0;
  }

  const pipeline = redis.pipeline();
  keys.forEach((key) => pipeline.del(key));
  await pipeline.exec();
  console.log("[cache] cleared keys", keys.length);
  return keys.length;
}

export { redis };
