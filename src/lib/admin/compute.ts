// Pure admin computations over already-loaded rows (no Prisma client, Next or env imports),
// shared by the dashboard and both CSV exports.
import type { Participant, Response } from "@/generated/prisma/client";
import {
  agreement,
  buildAnswerString,
  findDuplicateGroups,
  isStraightLiner,
  scoreResponse,
  type AnswerKey,
  type QResponse,
} from "@/lib/quality";
import { reliabilitySummary, unitAgreement, type ReliabilitySummary } from "@/lib/quality/reliability";
import type { Choice } from "@/lib/schemas";
import type { CsvCell } from "./csv";

export type AdminParticipant = Participant & { responses: Response[] };
export type AnswerKeys = Record<string, AnswerKey>;

export type ReliabilityGroup = ReliabilitySummary & {
  /** Participants with at least one answered response in this group. */
  participants: number;
};

export type ScenarioAgreement = {
  scenarioId: string;
  title: string;
  /** Answered ratings for this scenario. */
  n: number;
  /** Share of agreeing participant pairs, 0–100; NaN with fewer than 2 ratings. */
  pairwisePct: number;
  mode: Choice | null;
  /** Share of ratings that chose `mode`, 0–100. */
  modeShare: number;
  /** null when the scenario has no answer key or no ratings. */
  modeMatchesKey: boolean | null;
};

export type DashboardStats = {
  started: number;
  completed: number;
  inProgress: number;
  comprehensionFailures: number;
  duplicateGroups: { groupId: string; participantIds: string[] }[];
  straightLiners: string[];
  /** Inter-rater reliability of the utilitarian question: participants are raters, scenarios units. */
  reliability: {
    all: ReliabilityGroup;
    /** Excludes duplicate-group members, straight-liners and comprehension failures. */
    unflagged: ReliabilityGroup;
    /** Every scenario with at least one answer, lowest agreement first. */
    scenarios: ScenarioAgreement[];
  };
};

type Analysed = {
  p: AdminParticipant;
  answered: QResponse[];
  /** null unless completed and sharing its answer string with another completed participant */
  duplicateGroup: string | null;
  /** null unless completed (§3.12 only applies to finished participants) */
  straightLiner: boolean | null;
  utilitarianPct: number;
  kantianPct: number;
};

function toQResponse(r: Response): QResponse | null {
  if (!r.answeredAt || !r.utilitarianChoice) return null;
  return {
    scenarioId: r.scenarioId,
    utilitarian: r.utilitarianChoice,
    kantian: r.kantianChoice ?? undefined,
  };
}

export function analyse(participants: AdminParticipant[], keys: AnswerKeys): Analysed[] {
  const base = participants.map((p) => ({
    p,
    answered: p.responses.map(toQResponse).filter((r): r is QResponse => r !== null),
  }));
  const groups = findDuplicateGroups(
    base
      .filter((b) => b.p.completedAt)
      .map((b) => ({
        participantId: b.p.id,
        answerString: buildAnswerString(b.answered),
      })),
  );
  return base.map(({ p, answered }) => {
    const pct = agreement(answered, keys);
    return {
      p,
      answered,
      duplicateGroup: groups.get(p.id) ?? null,
      straightLiner: p.completedAt ? isStraightLiner(answered) : null,
      utilitarianPct: pct.utilitarianPct,
      kantianPct: pct.kantianPct,
    };
  });
}

function ratingsByScenario(rows: Analysed[]): Map<string, Choice[]> {
  const units = new Map<string, Choice[]>();
  for (const r of rows) {
    for (const q of r.answered) units.set(q.scenarioId, [...(units.get(q.scenarioId) ?? []), q.utilitarian]);
  }
  return units;
}

function reliabilityGroup(rows: Analysed[]): ReliabilityGroup {
  return {
    ...reliabilitySummary(ratingsByScenario(rows)),
    participants: rows.filter((r) => r.answered.length > 0).length,
  };
}

const isFlagged = (r: Analysed) =>
  r.duplicateGroup !== null || r.straightLiner === true || r.p.comprehensionPassed === false;

function computeReliability(
  rows: Analysed[],
  keys: AnswerKeys,
  titles: Record<string, string>,
): DashboardStats["reliability"] {
  const scenarios = [...ratingsByScenario(rows)].map(([scenarioId, ratings]): ScenarioAgreement => {
    const a = unitAgreement(ratings);
    const mode = a.mode as Choice | null;
    const key = Object.hasOwn(keys, scenarioId) ? keys[scenarioId] : undefined;
    return {
      scenarioId,
      title: titles[scenarioId] ?? scenarioId,
      n: a.n,
      pairwisePct: a.pairwisePct,
      mode,
      modeShare: a.modeShare,
      modeMatchesKey: key && mode ? key.utilitarian.includes(mode) : null,
    };
  });
  // Lowest agreement first; scenarios that can't be scored yet (NaN) go last.
  const rank = (s: ScenarioAgreement) => (Number.isNaN(s.pairwisePct) ? Infinity : s.pairwisePct);
  scenarios.sort((a, b) => rank(a) - rank(b) || (a.scenarioId < b.scenarioId ? -1 : 1));
  return {
    all: reliabilityGroup(rows),
    unflagged: reliabilityGroup(rows.filter((r) => !isFlagged(r))),
    scenarios,
  };
}

export function computeStats(
  participants: AdminParticipant[],
  keys: AnswerKeys,
  titles: Record<string, string> = {},
): DashboardStats {
  const rows = analyse(participants, keys);
  const completed = rows.filter((r) => r.p.completedAt).length;
  const groups = new Map<string, string[]>();
  for (const r of rows) {
    if (r.duplicateGroup) groups.set(r.duplicateGroup, [...(groups.get(r.duplicateGroup) ?? []), r.p.id]);
  }
  return {
    started: rows.length,
    completed,
    inProgress: rows.length - completed,
    comprehensionFailures: rows.filter((r) => r.p.comprehensionPassed === false).length,
    duplicateGroups: [...groups]
      .map(([groupId, ids]) => ({ groupId, participantIds: ids.sort() }))
      .sort((a, b) => a.groupId.localeCompare(b.groupId)),
    straightLiners: rows
      .filter((r) => r.straightLiner)
      .map((r) => r.p.id)
      .sort(),
    reliability: computeReliability(rows, keys, titles),
  };
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);
/** Seconds between two timestamps (ms precision kept), or null if either is missing. */
const seconds = (from: Date | null, to: Date | null) => (from && to ? (to.getTime() - from.getTime()) / 1000 : null);
/** Agent 1 returns NaN for a theory with nothing scored; csvCell renders NaN as blank. */
const pct = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : null);

export const RESPONSES_HEADER = [
  "participant_id",
  "scenario_id",
  "position",
  "question_order",
  "utilitarian_choice",
  "kantian_choice",
  "own_choice",
  "confidence",
  "first_served_at",
  "served_at",
  "answered_at",
  "time_on_scenario_sec",
  "utilitarian_correct",
  "kantian_correct",
] as const;

export function responseRows(participants: AdminParticipant[], keys: AnswerKeys): CsvCell[][] {
  const rows: CsvCell[][] = [];
  const sorted = [...participants].sort((a, b) => a.id.localeCompare(b.id));
  for (const p of sorted) {
    for (const r of [...p.responses].sort((a, b) => a.position - b.position)) {
      const q = toQResponse(r);
      const key = keys[r.scenarioId];
      const score = q && key ? scoreResponse(q, key) : null;
      rows.push([
        p.id,
        r.scenarioId,
        r.position,
        r.questionOrder,
        r.utilitarianChoice,
        r.kantianChoice,
        r.ownChoice,
        r.confidence,
        iso(r.firstServedAt),
        iso(r.servedAt),
        iso(r.answeredAt),
        seconds(r.servedAt, r.answeredAt),
        score?.utilitarianCorrect,
        score?.kantianCorrect,
      ]);
    }
  }
  return rows;
}

export const PARTICIPANTS_HEADER = [
  "participant_id",
  "consented_at",
  "started_at",
  "age_range",
  "country",
  "drives",
  "ethics_coursework",
  "demographics_at",
  "comprehension_passed",
  "primer_completed_at",
  "status",
  "scenarios_answered",
  "scenarios_total",
  "completed_at",
  "total_time_sec",
  "duplicate_group",
  "straight_liner",
  "utilitarian_agreement_pct",
  "kantian_agreement_pct",
] as const;

export function participantRows(participants: AdminParticipant[], keys: AnswerKeys): CsvCell[][] {
  return analyse(participants, keys)
    .sort((a, b) => a.p.id.localeCompare(b.p.id))
    .map(({ p, answered, duplicateGroup, straightLiner, utilitarianPct, kantianPct }) => [
      p.id,
      iso(p.consentedAt),
      iso(p.startedAt),
      // Prisma identifiers carry an "age_" prefix; export the spec's values ("18_24").
      p.ageRange?.replace(/^age_/, ""),
      p.country,
      p.drives,
      p.ethicsCoursework,
      iso(p.demographicsAt),
      p.comprehensionPassed,
      iso(p.primerCompletedAt),
      p.completedAt ? "completed" : "in_progress",
      answered.length,
      p.scenarioOrder.length,
      iso(p.completedAt),
      seconds(p.startedAt, p.completedAt),
      duplicateGroup,
      straightLiner,
      pct(utilitarianPct),
      pct(kantianPct),
    ]);
}
