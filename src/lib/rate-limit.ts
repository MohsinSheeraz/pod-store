// A small rate limiter for login, signup, uploads and checkout.
//
// With UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN set it counts in Redis, so the limit is
// shared by every server instance. Without them it counts in memory, which only protects a
// single instance (fine for one server, weak on serverless).

export type LimitResult = { ok: boolean; remaining: number; retryAfter: number };

type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();

function memoryHit(key: string, limit: number, windowMs: number, now: number): LimitResult {
  // Drop expired buckets now and then so the map can't grow forever.
  if (memory.size > 5000) {
    for (const [k, b] of memory) if (b.resetAt <= now) memory.delete(k);
  }
  let b = memory.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    memory.set(key, b);
  }
  b.count += 1;
  return {
    ok: b.count <= limit,
    remaining: Math.max(0, limit - b.count),
    retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
  };
}

async function redisHit(key: string, limit: number, windowSec: number): Promise<LimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    // INCR, then set the expiry on the first hit, then read the time left.
    const res = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec), "NX"],
        ["TTL", key],
      ]),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { result?: number }[];
    const count = Number(out[0]?.result ?? 0);
    const ttl = Number(out[2]?.result ?? windowSec);
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfter: Math.max(1, ttl > 0 ? ttl : windowSec),
    };
  } catch {
    return null; // Redis unreachable: fall back to memory rather than blocking everyone
  }
}

/** Counts one hit for `key`. ok is false once more than `limit` hits land in the window. */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowSec: number },
  now = Date.now()
): Promise<LimitResult> {
  const viaRedis = await redisHit(`rl:${key}`, opts.limit, opts.windowSec);
  return viaRedis ?? memoryHit(key, opts.limit, opts.windowSec * 1000, now);
}

/** Best-effort client address from the proxy headers. */
export function clientIp(headers: Headers) {
  const fwd = headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : headers.get("x-real-ip")) || "unknown";
}

export function tooManyRequests(retryAfter: number, message = "Too many attempts. Please try again later.") {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/** Test helper. */
export const _resetRateLimits = () => memory.clear();
