import { afterEach, describe, expect, it, vi } from "vitest";
import { participantHashWithSecret } from "@/lib/auth/hash";

const A = "a".repeat(32);
const B = "b".repeat(32);

describe("participantHash", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is deterministic and hex SHA-256 sized", () => {
    const h = participantHashWithSecret(A, "1234567890");
    expect(h).toBe(participantHashWithSecret(A, "1234567890"));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches a known HMAC-SHA256 vector", () => {
    // RFC 4231 test case 2
    expect(participantHashWithSecret("Jefe", "what do ya want for nothing?")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  it("depends on the secret and on the subject", () => {
    expect(participantHashWithSecret(A, "sub-1")).not.toBe(participantHashWithSecret(B, "sub-1"));
    expect(participantHashWithSecret(A, "sub-1")).not.toBe(participantHashWithSecret(A, "sub-2"));
  });

  it("does not contain the raw subject", () => {
    expect(participantHashWithSecret(A, "1234567890")).not.toContain("1234567890");
  });

  it("rejects an empty subject", () => {
    expect(() => participantHashWithSecret(A, "")).toThrow();
  });

  it("participantHash() uses PARTICIPANT_HASH_SECRET", async () => {
    vi.resetModules();
    vi.stubEnv("PARTICIPANT_HASH_SECRET", A);
    const { participantHash } = await import("@/lib/auth/hash");
    expect(participantHash("sub-1")).toBe(participantHashWithSecret(A, "sub-1"));
  });
});
