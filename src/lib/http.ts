import "server-only";
import { env } from "@/lib/env";

// Owner: Agent 3. Shared helpers for the write endpoints (§3.8).

export type ApiErrorCode =
  | "bad_origin" // 403
  | "unsupported_media_type" // 415
  | "unauthorized" // 401
  | "no_participant" // 403
  | "wrong_step" // 403
  | "study_completed" // 409
  | "already_submitted" // 409 (demographics / comprehension)
  | "already_answered" // 409 (scenario response)
  | "rate_limited" // 429
  | "invalid_json" // 422
  | "validation"; // 422

export type ApiOk = { ok: true; next: string };
export type ApiErr = { ok: false; error: ApiErrorCode; next?: string; fields?: string[] };

const NO_STORE = { "Cache-Control": "no-store" };

export function ok(next: string): Response {
  return Response.json({ ok: true, next } satisfies ApiOk, { status: 200, headers: NO_STORE });
}

export function fail(
  status: number,
  error: ApiErrorCode,
  extra: { next?: string; fields?: string[]; headers?: Record<string, string> } = {},
): Response {
  const body: ApiErr = { ok: false, error };
  if (extra.next !== undefined) body.next = extra.next;
  if (extra.fields !== undefined) body.fields = extra.fields;
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra.headers } });
}

/** The site's own origin, from NEXTAUTH_URL. */
export function expectedOrigin(): string {
  return new URL(env.NEXTAUTH_URL).origin;
}

/** CSRF check for our routes: the Origin header must equal our origin exactly. A missing Origin fails. */
export function isSameOrigin(req: Request, expected: string): boolean {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export function isJsonContentType(req: Request): boolean {
  const ct = req.headers.get("content-type");
  if (!ct) return false;
  return ct.split(";")[0].trim().toLowerCase() === "application/json";
}

/** Origin, then Content-Type. Returns an error response, or null if both pass. */
export function checkRequest(req: Request, expected: string = expectedOrigin()): Response | null {
  if (!isSameOrigin(req, expected)) return fail(403, "bad_origin");
  if (!isJsonContentType(req)) return fail(415, "unsupported_media_type");
  return null;
}

export async function readJson(req: Request): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    return { ok: true, data: await req.json() };
  } catch {
    return { ok: false };
  }
}

/** Field paths from a zod error (never values). */
export function issueFields(issues: readonly { path: readonly PropertyKey[] }[]): string[] {
  return [...new Set(issues.map((i) => i.path.map(String).join(".") || "(root)"))];
}
