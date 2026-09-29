import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.fn();
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = vi.fn(() => "sliding-window");
    limit = limit;
  }
  return { Ratelimit };
});
vi.mock("@upstash/redis", () => ({ Redis: class {} }));

const { RATE_LIMIT, checkRateLimit, resetRateLimit, resetRateLimitBackend } = await import("@/lib/rate-limit");

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimit();
    resetRateLimitBackend();
    limit.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("falls back to the in-memory window when Upstash isn't configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    for (let i = 0; i < RATE_LIMIT; i++) expect(await checkRateLimit("k")).toEqual({ ok: true });
    expect((await checkRateLimit("k")).ok).toBe(false);
    expect(limit).not.toHaveBeenCalled();
  });

  describe("with Upstash configured", () => {
    beforeEach(() => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    });

    it("allows when Upstash says success", async () => {
      limit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
      expect(await checkRateLimit("k")).toEqual({ ok: true });
      expect(limit).toHaveBeenCalledWith("k");
    });

    it("blocks with retryAfterSec from Upstash's reset time", async () => {
      vi.spyOn(Date, "now").mockReturnValue(1_000_000);
      limit.mockResolvedValue({ success: false, reset: 1_000_000 + 12_300 });
      expect(await checkRateLimit("k")).toEqual({ ok: false, retryAfterSec: 13 });
    });

    it("fails open when Upstash errors", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      limit.mockRejectedValue(new Error("network down"));
      expect(await checkRateLimit("k")).toEqual({ ok: true });
    });
  });
});
