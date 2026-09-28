import "server-only";

// Contract stub (Agent 0). Owner: Agent 3 — replace the body, keep the signature.

/** In-memory sliding window, keyed by participant hash: 10 writes/min (§3.9). */
export function rateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  void key;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 3");
}
