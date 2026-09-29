import { expect } from "vitest";
import { db } from "@/lib/db";
import { participantHash } from "@/lib/auth/hash";
import { ensureParticipant } from "@/lib/flow/participant";
import { resetRateLimit } from "@/lib/rate-limit";
import { POST as postDemographics } from "@/app/api/demographics/route";
import { POST as postComprehension } from "@/app/api/comprehension/route";
import { POST as postResponses } from "@/app/api/responses/route";
import { COMPREHENSION_CORRECT } from "@/config/comprehension-answers";
import { auth } from "./auth-mock";

// Shared helpers for the integration tests. Each test file mocks the auth modules with:
//   vi.mock("@/lib/auth/session", async () => (await import("./auth-mock")).sessionMock);
//   vi.mock("@/lib/auth/consent-cookie", async () => (await import("./auth-mock")).consentMock);
// so "who is signed in" is controlled by signInAs() / signOut() below.

/** Signs in as the Google account with this `sub`; returns its participant hash. */
export function signInAs(googleSub: string): string {
  auth.hash = participantHash(googleSub);
  auth.consent = true;
  return auth.hash;
}

export function signOut(): void {
  auth.hash = null;
}

export const ORIGIN = new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").origin;

export function jsonRequest(body: unknown, headers: Record<string, string | undefined> = {}): Request {
  const h = new Headers();
  const all: Record<string, string | undefined> = { origin: ORIGIN, "content-type": "application/json", ...headers };
  for (const [k, v] of Object.entries(all)) if (v !== undefined) h.set(k, v);
  return new Request(`${ORIGIN}/api/test`, { method: "POST", headers: h, body: JSON.stringify(body) });
}

type Handler = (req: Request) => Promise<Response>;

export async function call(handler: Handler, body: unknown, headers?: Record<string, string | undefined>) {
  const res = await handler(jsonRequest(body, headers));
  return { status: res.status, body: (await res.json()) as { ok: boolean; next?: string; error?: string } };
}

export const routes = {
  demographics: postDemographics as Handler,
  comprehension: postComprehension as Handler,
  responses: postResponses as Handler,
};

export const DEMOGRAPHICS = { ageRange: "age_25_34", country: "DE", drives: "yes", ethicsCoursework: "some" };
export const COMPREHENSION = { answers: [...COMPREHENSION_CORRECT] };

/** Guards against ever wiping the dev database, then empties the test database. */
export async function resetDb(): Promise<void> {
  const url = process.env.DATABASE_URL ?? "";
  expect(url, "integration tests must run against TEST_DATABASE_URL").toBe(process.env.TEST_DATABASE_URL);
  await db.$executeRawUnsafe("TRUNCATE TABLE responses, participants RESTART IDENTITY CASCADE");
  resetRateLimit();
}

export async function counts() {
  return { participants: await db.participant.count(), responses: await db.response.count() };
}

/** Creates the participant (as /study would) and completes demographics + primer via the real routes. */
export async function startParticipant(googleSub: string) {
  signInAs(googleSub);
  const created = await ensureParticipant();
  if (!created) throw new Error("ensureParticipant returned null");
  expect(await call(routes.demographics, DEMOGRAPHICS)).toMatchObject({ status: 200, body: { next: "/primer" } });
  expect(await call(routes.comprehension, COMPREHENSION)).toMatchObject({ status: 200, body: { next: "/scenario" } });
  return created.participant;
}

export const answerFor = (scenarioId: string) => ({ scenarioId, utilitarian: "maintain", kantian: "swerve_left" });
