import type { Participant } from "@/generated/prisma/client";

const T = new Date("2026-01-01T00:00:00Z");

/** A plain Participant object; override any field. Defaults: consented, nothing else done. */
export function participant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: "p1",
    participantHash: "hash-1",
    consentedAt: T,
    startedAt: T,
    ageRange: null,
    country: null,
    drives: null,
    ethicsCoursework: null,
    demographicsAt: null,
    comprehensionAnswers: null,
    comprehensionPassed: null,
    primerCompletedAt: null,
    scenarioOrder: ["s02", "s01", "s03"],
    completedAt: null,
    ...overrides,
  };
}

/** New participants start at the primer. */
export const atPrimer = {};
export const atScenarios = { primerCompletedAt: T };
export const done = { ...atScenarios, completedAt: T };
