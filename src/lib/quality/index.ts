// Quality checks (Agent 1). Pure: no Prisma, Next or env imports.
// Callers pass only answered responses (both choices non-null); for duplicate
// detection, only completed participants.
import { createHash } from "node:crypto";
import type { Choice } from "@/lib/schemas";

export type QResponse = { scenarioId: string; utilitarian: Choice; kantian: Choice };
export type AnswerKey = { utilitarian: Choice[]; kantian: Choice[] };

/** Plain code-unit comparison: locale-independent and deterministic. */
function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Sorted by scenarioId (not display order): "s01:U=maintain,K=swerve_left|s02:...".
 * Empty input gives "". Throws if a scenarioId appears more than once.
 */
export function buildAnswerString(rs: QResponse[]): string {
  const sorted = [...rs].sort((a, b) => compareIds(a.scenarioId, b.scenarioId));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].scenarioId === sorted[i - 1].scenarioId) {
      throw new Error(`buildAnswerString: duplicate scenarioId "${sorted[i].scenarioId}"`);
    }
  }
  return sorted.map((r) => `${r.scenarioId}:U=${r.utilitarian},K=${r.kantian}`).join("|");
}

/** First 8 hex chars of sha256(answerString). */
export function duplicateGroupId(answerString: string): string {
  return createHash("sha256").update(answerString, "utf8").digest("hex").slice(0, 8);
}

/**
 * participantId -> groupId (§3.13). Only participants whose answer string is shared
 * by 2+ distinct participants appear in the map; everyone else has no group (null).
 * Empty answer strings are never grouped. The group ID depends only on the string,
 * so it is stable across runs.
 */
export function findDuplicateGroups(ps: { participantId: string; answerString: string }[]): Map<string, string> {
  const byString = new Map<string, Set<string>>();
  for (const { participantId, answerString } of ps) {
    if (answerString === "") continue;
    let ids = byString.get(answerString);
    if (!ids) byString.set(answerString, (ids = new Set()));
    ids.add(participantId);
  }
  const groups = new Map<string, string>();
  for (const [answerString, ids] of byString) {
    if (ids.size < 2) continue;
    const groupId = duplicateGroupId(answerString);
    for (const id of ids) groups.set(id, groupId);
  }
  return groups;
}

/**
 * §3.12: true when every utilitarian and Kantian choice across all responses has the
 * same value. False for empty input. (The optional own choice is not considered.)
 */
export function isStraightLiner(rs: QResponse[]): boolean {
  if (rs.length === 0) return false;
  const first = rs[0].utilitarian;
  return rs.every((r) => r.utilitarian === first && r.kantian === first);
}

/** A choice is correct if it appears in that theory's answerKey array (multi-correct keys allowed). */
export function scoreResponse(r: QResponse, key: AnswerKey): { utilitarianCorrect: boolean; kantianCorrect: boolean } {
  return {
    utilitarianCorrect: key.utilitarian.includes(r.utilitarian),
    kantianCorrect: key.kantian.includes(r.kantian),
  };
}

/** Percentage on a 0–100 scale, rounded half-up to 2 decimals; NaN when total is 0. */
function pct(correct: number, total: number): number {
  if (total === 0) return NaN;
  return Math.round((correct * 10000) / total) / 100;
}

/**
 * Agreement with the answer key per theory: correct ÷ answered × 100, rounded to
 * 2 decimals (e.g. 66.67).
 * - Responses whose scenarioId is not in `keys` are excluded from both counts.
 * - If no response can be scored, both values are NaN (export as a blank cell).
 */
export function agreement(
  rs: QResponse[],
  keys: Record<string, AnswerKey>,
): { utilitarianPct: number; kantianPct: number } {
  let answered = 0;
  let u = 0;
  let k = 0;
  for (const r of rs) {
    if (!Object.hasOwn(keys, r.scenarioId)) continue;
    const s = scoreResponse(r, keys[r.scenarioId]);
    answered++;
    if (s.utilitarianCorrect) u++;
    if (s.kantianCorrect) k++;
  }
  return { utilitarianPct: pct(u, answered), kantianPct: pct(k, answered) };
}
