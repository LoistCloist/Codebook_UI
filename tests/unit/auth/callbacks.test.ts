import { describe, expect, it } from "vitest";
import type { Account, Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { parseAdminEmails } from "@/lib/auth/admin-emails";
import { createCallbacks } from "@/lib/auth/callbacks";
import { participantHashWithSecret } from "@/lib/auth/hash";

const hash = (sub: string) => participantHashWithSecret("k".repeat(32), sub);
const cb = createCallbacks({ hash, adminEmails: parseAdminEmails("Admin@Example.com") });

const EMAIL = "admin@example.com";
const NAME = "Ada Lovelace";
const PIC = "https://lh3.googleusercontent.com/a/pic";
const SUB = "109876543210";

const signInToken: JWT = { name: NAME, email: EMAIL, picture: PIC, sub: SUB };
const account = { provider: "google", type: "oidc", providerAccountId: SUB } as Account;
const profile = (over: Partial<Profile> = {}): Profile =>
  ({ sub: SUB, email: EMAIL, email_verified: true, name: NAME, picture: PIC, ...over }) as Profile;

function assertNoPii(obj: unknown) {
  const json = JSON.stringify(obj);
  for (const s of [EMAIL, NAME, PIC, SUB, "Admin@Example.com"]) expect(json).not.toContain(s);
  for (const k of ["email", "name", "picture", "image", "sub", "user"]) {
    expect(obj as object).not.toHaveProperty(k);
  }
}

describe("jwt callback", () => {
  it("on sign-in keeps only participantHash and isAdmin", () => {
    const t = cb.jwt({ token: signInToken, account, profile: profile() });
    expect(t).toEqual({ participantHash: hash(SUB), isAdmin: true });
    assertNoPii(t);
  });

  it("falls back to profile.sub when providerAccountId is missing", () => {
    const t = cb.jwt({ token: signInToken, account: { ...account, providerAccountId: "" }, profile: profile() });
    expect(t?.participantHash).toBe(hash(SUB));
  });

  it("returns null (no session) when no subject is available", () => {
    const t = cb.jwt({
      token: signInToken,
      account: { ...account, providerAccountId: "" },
      profile: profile({ sub: undefined }),
    });
    expect(t).toBeNull();
  });

  it("isAdmin is false for non-listed emails", () => {
    const t = cb.jwt({ token: signInToken, account, profile: profile({ email: "someone@example.com" }) });
    expect(t?.isAdmin).toBe(false);
  });

  it("isAdmin requires email_verified === true", () => {
    expect(cb.jwt({ token: signInToken, account, profile: profile({ email_verified: false }) })?.isAdmin).toBe(false);
    expect(cb.jwt({ token: signInToken, account, profile: profile({ email_verified: undefined }) })?.isAdmin).toBe(
      false,
    );
  });

  it("on later calls strips anything but the two claims", () => {
    const t = cb.jwt({
      token: { participantHash: "abc", isAdmin: true, email: EMAIL, name: NAME, picture: PIC, sub: SUB, iat: 1, exp: 2 },
    });
    expect(t).toEqual({ participantHash: "abc", isAdmin: true });
  });

  it("on later calls invalidates tokens without a participantHash", () => {
    expect(cb.jwt({ token: { email: EMAIL } })).toBeNull();
  });
});

describe("session callback", () => {
  it("exposes only expires, participantHash and isAdmin", () => {
    const session = {
      user: { name: NAME, email: EMAIL, image: PIC, id: SUB },
      expires: "2030-01-01T00:00:00.000Z",
    } as unknown as Session;
    const out = cb.session({ session, token: { participantHash: "abc", isAdmin: false, email: EMAIL, sub: SUB } });
    expect(out).toEqual({ expires: "2030-01-01T00:00:00.000Z", participantHash: "abc", isAdmin: false });
    assertNoPii(out);
  });

  it("end to end: sign-in token -> session has no PII", () => {
    const token = cb.jwt({ token: signInToken, account, profile: profile() })!;
    const later = cb.jwt({ token })!;
    const out = cb.session({
      session: { user: { name: NAME, email: EMAIL, image: PIC }, expires: "x" } as Session,
      token: later,
    });
    assertNoPii(token);
    assertNoPii(later);
    assertNoPii(out);
    expect(out.isAdmin).toBe(true);
  });
});
