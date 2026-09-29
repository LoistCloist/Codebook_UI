import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Owner: Agent 3.
// Two implementations of the same 10 writes/min sliding window:
// - rateLimit(): in-memory, per process (local dev, tests, single-server hosts).
// - checkRateLimit(): shared across instances via Upstash Redis when
//   UPSTASH_REDIS_REST_URL/TOKEN are set (serverless, e.g. Vercel); otherwise
//   falls back to rateLimit(). Write routes call checkRateLimit().

export const RATE_LIMIT = 10;
export const RATE_WINDOW_MS = 60_000;
const SWEEP_THRESHOLD = 10_000;

const hits = new Map<string, number[]>();

function prune(times: number[], now: number): number[] {
  return times.filter((t) => now - t < RATE_WINDOW_MS);
}

/** In-memory sliding window, keyed by participant hash: 10 writes/min (§3.9). */
export function rateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();

  if (hits.size > SWEEP_THRESHOLD) {
    for (const [k, times] of hits) {
      const live = prune(times, now);
      if (live.length === 0) hits.delete(k);
      else hits.set(k, live);
    }
  }

  const times = prune(hits.get(key) ?? [], now);
  if (times.length >= RATE_LIMIT) {
    hits.set(key, times);
    const retryAfterMs = times[0] + RATE_WINDOW_MS - now;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  times.push(now);
  hits.set(key, times);
  return { ok: true };
}

/** Test helper: forget all recorded hits. */
export function resetRateLimit(): void {
  hits.clear();
}

type LimitResult = { ok: boolean; retryAfterSec?: number };

let upstash: Ratelimit | null | undefined;

function getUpstash(): Ratelimit | null {
  if (upstash === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    upstash =
      url && token
        ? new Ratelimit({
            redis: new Redis({ url, token }),
            limiter: Ratelimit.slidingWindow(RATE_LIMIT, `${RATE_WINDOW_MS / 1000} s`),
            prefix: "codebook:rl",
            // On timeout Upstash lets the request through (fail open).
            timeout: 1_000,
          })
        : null;
  }
  return upstash;
}

/**
 * Shared rate limit for write routes. Uses Upstash when configured, else the
 * in-memory window. Fails open on Upstash errors: one-response-per-person is
 * enforced by the database, so the limiter is defence in depth, and failing
 * closed would lock participants out of the study during a Redis outage.
 */
export async function checkRateLimit(key: string): Promise<LimitResult> {
  const limiter = getUpstash();
  if (!limiter) return rateLimit(key);
  try {
    const res = await limiter.limit(key);
    if (res.success) return { ok: true };
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) };
  } catch (err) {
    console.error(`[rate-limit] Upstash unavailable, allowing request: ${(err as Error).name}`);
    return { ok: true };
  }
}

/** Test helper: forget the cached Upstash client so env changes take effect. */
export function resetRateLimitBackend(): void {
  upstash = undefined;
}
