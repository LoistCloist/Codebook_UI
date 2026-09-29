import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RATE_LIMIT, rateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("rateLimit (sliding window, 10/min per key)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    resetRateLimit();
  });
  afterEach(() => vi.useRealTimers());

  it("allows 10 writes, then blocks the 11th with retryAfterSec", () => {
    for (let i = 0; i < RATE_LIMIT; i++) expect(rateLimit("a")).toEqual({ ok: true });
    const blocked = rateLimit("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(60);
  });

  it("keys are independent", () => {
    for (let i = 0; i < RATE_LIMIT; i++) rateLimit("a");
    expect(rateLimit("b").ok).toBe(true);
  });

  it("slides: old hits expire individually", () => {
    rateLimit("a"); // t=0
    vi.advanceTimersByTime(30_000);
    for (let i = 0; i < RATE_LIMIT - 1; i++) rateLimit("a"); // t=30s
    expect(rateLimit("a")).toMatchObject({ ok: false, retryAfterSec: 30 });
    vi.advanceTimersByTime(30_000); // t=60s: the first hit expires
    expect(rateLimit("a").ok).toBe(true);
    expect(rateLimit("a").ok).toBe(false);
  });

  it("blocked attempts don't extend the window", () => {
    for (let i = 0; i < RATE_LIMIT; i++) rateLimit("a");
    for (let i = 0; i < 5; i++) rateLimit("a");
    vi.advanceTimersByTime(60_000);
    expect(rateLimit("a").ok).toBe(true);
  });
});
