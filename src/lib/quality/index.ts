// Contract stub (Agent 0). Owner: Agent 1 — replace the bodies, keep the signatures.
// Pure: no Prisma, Next or env imports.
import type { Choice } from "@/lib/schemas";

export type QResponse = { scenarioId: string; utilitarian: Choice; kantian: Choice };
export type AnswerKey = { utilitarian: Choice[]; kantian: Choice[] };

/** Sorted by scenarioId: "s01:U=maintain,K=swerve_left|s02:..." */
export function buildAnswerString(rs: QResponse[]): string {
  void rs;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 1");
}

/** participantId -> groupId (§3.13) */
export function findDuplicateGroups(ps: { participantId: string; answerString: string }[]): Map<string, string> {
  void ps;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 1");
}

/** §3.12; false for empty input */
export function isStraightLiner(rs: QResponse[]): boolean {
  void rs;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 1");
}

export function scoreResponse(r: QResponse, key: AnswerKey): { utilitarianCorrect: boolean; kantianCorrect: boolean } {
  void r;
  void key;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 1");
}

export function agreement(
  rs: QResponse[],
  keys: Record<string, AnswerKey>,
): { utilitarianPct: number; kantianPct: number } {
  void rs;
  void keys;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 1");
}
