import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SEC, signConsentValue, verifyConsentValue } from "@/lib/auth/consent-cookie";

const S = "s".repeat(32);
const NOW = 1_800_000_000_000;
const EXP = NOW + CONSENT_MAX_AGE_SEC * 1000;

describe("consent cookie value", () => {
  it("verifies a freshly signed value", () => {
    expect(verifyConsentValue(S, signConsentValue(S, EXP), NOW)).toBe(true);
  });

  it("rejects a value signed with another secret", () => {
    expect(verifyConsentValue(S, signConsentValue("t".repeat(32), EXP), NOW)).toBe(false);
  });

  it("rejects tampered expiry or signature", () => {
    const [exp, sig] = signConsentValue(S, EXP).split(".");
    expect(verifyConsentValue(S, `${Number(exp) + 1}.${sig}`, NOW)).toBe(false);
    expect(verifyConsentValue(S, `${exp}.${sig.slice(0, -1)}A`, NOW)).toBe(false);
  });

  it("rejects expired values and implausibly far expiries", () => {
    expect(verifyConsentValue(S, signConsentValue(S, EXP), EXP)).toBe(false);
    const far = NOW + 24 * 3600 * 1000;
    expect(verifyConsentValue(S, signConsentValue(S, far), NOW)).toBe(false);
  });

  it("rejects missing or malformed values", () => {
    for (const v of [undefined, "", "1", "abc.def", "1.2.3", "yes"]) {
      expect(verifyConsentValue(S, v, NOW)).toBe(false);
    }
  });
});

describe("setConsentIntent / readConsentIntent", () => {
  const jar = new Map<string, { value: string; opts?: Record<string, unknown> }>();

  beforeEach(() => {
    jar.clear();
    vi.resetModules();
    vi.stubEnv("NEXTAUTH_SECRET", S);
    vi.doMock("next/headers", () => ({
      cookies: async () => ({
        get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)!.value } : undefined),
        set: (n: string, value: string, opts?: Record<string, unknown>) => void jar.set(n, { value, opts }),
        delete: (n: string) => void jar.delete(n),
      }),
    }));
  });

  afterEach(() => {
    vi.doUnmock("next/headers");
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("round-trips and sets httpOnly, SameSite=Lax, 30-min cookie", async () => {
    const m = await import("@/lib/auth/consent-cookie");
    expect(await m.readConsentIntent()).toBe(false);
    await m.setConsentIntent();
    expect(jar.get(CONSENT_COOKIE)?.opts).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 60,
    });
    expect(await m.readConsentIntent()).toBe(true);
    await m.clearConsentIntent();
    expect(await m.readConsentIntent()).toBe(false);
  });

  it("rejects a forged cookie", async () => {
    const m = await import("@/lib/auth/consent-cookie");
    jar.set(CONSENT_COOKIE, { value: `${Date.now() + 60_000}.forged` });
    expect(await m.readConsentIntent()).toBe(false);
  });
});
