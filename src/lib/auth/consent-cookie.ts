import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// §3.4: signed, httpOnly, SameSite=Lax consent_intent cookie (30 min). Records consent only;
// never used for one-response enforcement.

export const CONSENT_COOKIE = "consent_intent";
export const CONSENT_MAX_AGE_SEC = 30 * 60;

function mac(secret: string, expiresAtMs: number): string {
  return createHmac("sha256", secret).update(`${CONSENT_COOKIE}:${expiresAtMs}`).digest("base64url");
}

/** Cookie value: "<expiresAtMs>.<HMAC-SHA256(secret, 'consent_intent:'+expiresAtMs)>". */
export function signConsentValue(secret: string, expiresAtMs: number): string {
  return `${expiresAtMs}.${mac(secret, expiresAtMs)}`;
}

/** True iff the value carries a valid signature and has not expired. */
export function verifyConsentValue(secret: string, value: string | undefined, nowMs = Date.now()): boolean {
  if (!value) return false;
  const match = /^(\d{1,16})\.([A-Za-z0-9_-]+)$/.exec(value);
  if (!match) return false;
  const expiresAtMs = Number(match[1]);
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= nowMs) return false;
  // Reject expiries further out than the cookie can legitimately carry.
  if (expiresAtMs > nowMs + CONSENT_MAX_AGE_SEC * 1000 + 60_000) return false;
  const expected = Buffer.from(mac(secret, expiresAtMs));
  const given = Buffer.from(match[2]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Sets the consent_intent cookie. Only callable from a server action or route handler. */
export async function setConsentIntent(nowMs = Date.now()): Promise<void> {
  const store = await cookies();
  store.set(CONSENT_COOKIE, signConsentValue(env.NEXTAUTH_SECRET, nowMs + CONSENT_MAX_AGE_SEC * 1000), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONSENT_MAX_AGE_SEC,
  });
}

/** True if a valid signed consent_intent cookie is present (§3.4). */
export async function readConsentIntent(): Promise<boolean> {
  const store = await cookies();
  return verifyConsentValue(env.NEXTAUTH_SECRET, store.get(CONSENT_COOKIE)?.value);
}

/** Optional: deletes the cookie. Only callable from a server action or route handler. */
export async function clearConsentIntent(): Promise<void> {
  const store = await cookies();
  store.delete(CONSENT_COOKIE);
}
