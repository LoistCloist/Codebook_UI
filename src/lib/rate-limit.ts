import "server-only";

// Owner: Agent 3.
// In-memory sliding window. Per-process only: a multi-instance deployment needs a
// shared store (e.g. Upstash Redis) behind the same interface.

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
