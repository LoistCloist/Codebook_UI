import "server-only";
import { db, Prisma, type Participant } from "@/lib/db";
import { getParticipantHash } from "@/lib/auth/session";
import { readConsentIntent } from "@/lib/auth/consent-cookie";
import { getNextStep, type Step } from "@/lib/flow/next-step";
import { shuffle } from "@/lib/flow/shuffle";
import { getScenarios } from "@/lib/scenarios";

// Owner: Agent 3.

export type ParticipantState = {
  participant: Participant;
  step: Step;
  answeredCount: number;
};

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function countAnswered(participantId: string): Promise<number> {
  return db.response.count({
    where: { participantId, answeredAt: { not: null } },
  });
}

/** Participant row + answered count + resolved step for a hash; null if no row exists. */
export async function loadParticipantState(participantHash: string): Promise<ParticipantState | null> {
  const participant = await db.participant.findUnique({
    where: { participantHash },
  });
  if (!participant) return null;
  const answeredCount = await countAnswered(participant.id);
  return {
    participant,
    step: getNextStep(participant, answeredCount),
    answeredCount,
  };
}

export async function getCurrentParticipant(): Promise<{
  participant: Participant;
  step: Step;
} | null> {
  const hash = await getParticipantHash();
  if (!hash) return null;
  const state = await loadParticipantState(hash);
  return state && { participant: state.participant, step: state.step };
}

/**
 * Used by /study (§3.5): returns the existing participant, or creates one on the
 * first authenticated visit if the consent_intent cookie is valid. Sets
 * consented_at/started_at and the scenario order (shuffled once, never again).
 * Returns null if not signed in, or signed in without a participant row and
 * without valid consent.
 */
export async function ensureParticipant(): Promise<{
  participant: Participant;
  step: Step;
} | null> {
  const hash = await getParticipantHash();
  if (!hash) return null;

  const existing = await loadParticipantState(hash);
  if (existing) return { participant: existing.participant, step: existing.step };

  if (!(await readConsentIntent())) return null;

  const now = new Date();
  const scenarioOrder = shuffle(getScenarios().map((s) => s.id));
  try {
    await db.participant.create({
      data: {
        participantHash: hash,
        consentedAt: now,
        startedAt: now,
        scenarioOrder,
      },
    });
  } catch (err) {
    // A concurrent request created the row first: the unique hash wins, use that row.
    if (!isUniqueViolation(err)) throw err;
  }

  const created = await loadParticipantState(hash);
  if (!created) throw new Error("ensureParticipant: participant row missing after create");
  return { participant: created.participant, step: created.step };
}
