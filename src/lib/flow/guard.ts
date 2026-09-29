import "server-only";
import { getParticipantHash } from "@/lib/auth/session";
import { stepToPath } from "@/lib/flow/next-step";
import { loadParticipantState, type ParticipantState } from "@/lib/flow/participant";
import { checkRequest, fail, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

// Owner: Agent 3. The shared pre-write chain for every write endpoint (§3.8, §5 Agent 3):
// origin → content-type → session (401) → participant exists (403) → not completed (409)
// → correct step (403/409, route-specific) → rate limit (429) → JSON body (422).
// The route then validates the body with zod (422) and writes.

export type GuardResult =
  | { ok: true; state: ParticipantState; body: unknown }
  | { ok: false; response: Response };

/** Returns an error response if the participant may not write at this route, else null. */
export type StepCheck = (state: ParticipantState) => Response | null;

export function wrongStep(state: ParticipantState): Response {
  return fail(403, "wrong_step", { next: stepToPath(state.step) });
}

export async function guardWrite(req: Request, checkStep: StepCheck): Promise<GuardResult> {
  const pre = checkRequest(req);
  if (pre) return { ok: false, response: pre };

  const hash = await getParticipantHash();
  if (!hash) return { ok: false, response: fail(401, "unauthorized", { next: "/" }) };

  const state = await loadParticipantState(hash);
  if (!state) return { ok: false, response: fail(403, "no_participant", { next: "/" }) };

  if (state.participant.completedAt || state.step.kind === "completed") {
    return { ok: false, response: fail(409, "study_completed", { next: "/completed" }) };
  }

  const stepError = checkStep(state);
  if (stepError) return { ok: false, response: stepError };

  const limit = rateLimit(hash);
  if (!limit.ok) {
    const retry = String(limit.retryAfterSec ?? 60);
    return { ok: false, response: fail(429, "rate_limited", { headers: { "Retry-After": retry } }) };
  }

  const body = await readJson(req);
  if (!body.ok) return { ok: false, response: fail(422, "invalid_json") };

  return { ok: true, state, body: body.data };
}
