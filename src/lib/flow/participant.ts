import "server-only";
import type { Participant } from "@/generated/prisma/client";
import type { Step } from "@/lib/flow/next-step";

// Contract stub (Agent 0). Owner: Agent 3 — replace the bodies, keep the signatures.

export async function getCurrentParticipant(): Promise<{ participant: Participant; step: Step } | null> {
  throw new Error("NOT_IMPLEMENTED: owned by Agent 3");
}

/** Used by /study (§3.5): creates the participant on first authenticated visit if consent_intent is valid. */
export async function ensureParticipant(): Promise<{ participant: Participant; step: Step } | null> {
  throw new Error("NOT_IMPLEMENTED: owned by Agent 3");
}
