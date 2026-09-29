import { describe, expect, it, vi } from "vitest";
import type { QResponse } from "@/lib/quality";

// Agent 1 owns @/lib/quality; until it is merged, use minimal reference implementations of the
// §4 contract so these tests exercise only the admin wiring.
vi.mock("@/lib/quality", () => {
  const buildAnswerString = (rs: QResponse[]) =>
    [...rs]
      .sort((a, b) => a.scenarioId.localeCompare(b.scenarioId))
      .map((r) => `${r.scenarioId}:U=${r.utilitarian},K=${r.kantian}`)
      .join("|");
  return {
    buildAnswerString,
    findDuplicateGroups: (ps: { participantId: string; answerString: string }[]) => {
      const m = new Map<string, string>();
      for (const p of ps) {
        if (ps.filter((q) => q.answerString === p.answerString).length > 1) {
          m.set(p.participantId, `g-${p.answerString.length}`);
        }
      }
      return m;
    },
    isStraightLiner: (rs: QResponse[]) =>
      rs.length > 0 && new Set(rs.flatMap((r) => [r.utilitarian, r.kantian])).size === 1,
    scoreResponse: (r: QResponse, k: { utilitarian: string[]; kantian: string[] }) => ({
      utilitarianCorrect: k.utilitarian.includes(r.utilitarian),
      kantianCorrect: k.kantian.includes(r.kantian),
    }),
    agreement: (rs: QResponse[], keys: Record<string, { utilitarian: string[]; kantian: string[] }>) => {
      const scored = rs.filter((r) => keys[r.scenarioId]);
      const pct = (n: number) => (scored.length ? Math.round((n / scored.length) * 10000) / 100 : NaN);
      return {
        utilitarianPct: pct(scored.filter((r) => keys[r.scenarioId].utilitarian.includes(r.utilitarian)).length),
        kantianPct: pct(scored.filter((r) => keys[r.scenarioId].kantian.includes(r.kantian)).length),
      };
    },
  };
});

const {
  PARTICIPANTS_HEADER,
  RESPONSES_HEADER,
  computeStats,
  participantRows,
  responseRows,
} = await import("@/lib/admin/compute");
type AdminParticipant = import("@/lib/admin/compute").AdminParticipant;
type Choice = "maintain" | "swerve_left" | "swerve_right";

const T0 = new Date("2026-01-01T00:00:00.000Z");
const at = (s: number) => new Date(T0.getTime() + s * 1000);
const keys = {
  s01: { utilitarian: ["swerve_right" as const], kantian: ["maintain" as const] },
  s02: { utilitarian: ["swerve_right" as const], kantian: ["maintain" as const, "swerve_right" as const] },
};

let seq = 0;
function resp(scenarioId: string, position: number, u?: Choice, k?: Choice, servedAt = 100, answerSec = 30) {
  return {
    id: `r${++seq}`,
    participantId: "",
    scenarioId,
    position,
    questionOrder: "U_first" as const,
    utilitarianChoice: u ?? null,
    kantianChoice: k ?? null,
    ownChoice: null,
    confidence: null,
    firstServedAt: at(servedAt - 10),
    servedAt: at(servedAt),
    answeredAt: u && k ? at(servedAt + answerSec) : null,
  };
}

function participant(id: string, over: Partial<AdminParticipant> = {}): AdminParticipant {
  return {
    id,
    participantHash: `hash-${id}`,
    consentedAt: at(0),
    startedAt: at(0),
    ageRange: "age_25_34",
    country: "GB",
    drives: "yes",
    ethicsCoursework: "some",
    demographicsAt: at(10),
    comprehensionAnswers: ["a", "b"],
    comprehensionPassed: true,
    primerCompletedAt: at(50),
    scenarioOrder: ["s02", "s01"],
    completedAt: null,
    responses: [],
    ...over,
  };
}

const people: AdminParticipant[] = [
  // a and b: identical answers (duplicate pair); a also scores 100% on both theories
  participant("a", {
    completedAt: at(600),
    responses: [resp("s02", 0, "swerve_right", "maintain"), resp("s01", 1, "swerve_right", "maintain", 200, 12.5)],
  }),
  participant("b", {
    completedAt: at(900),
    responses: [resp("s01", 0, "swerve_right", "maintain"), resp("s02", 1, "swerve_right", "maintain")],
  }),
  // c: straight-liner, failed comprehension
  participant("c", {
    completedAt: at(700),
    comprehensionPassed: false,
    responses: [resp("s01", 0, "maintain", "maintain"), resp("s02", 1, "maintain", "maintain")],
  }),
  // d: in progress with one answer that happens to be all-"maintain" and matches nobody's full string
  participant("d", {
    responses: [resp("s02", 0, "maintain", "maintain"), resp("s01", 1)],
  }),
  // e: in progress, before demographics/primer; nothing answered
  participant("e", { ageRange: null, country: null, drives: null, ethicsCoursework: null, demographicsAt: null, comprehensionPassed: null, primerCompletedAt: null }),
  // f: completed, answered a scenario that has since been removed from the key file
  participant("f", {
    completedAt: at(800),
    scenarioOrder: ["s01", "gone"],
    responses: [resp("s01", 0, "swerve_left", "swerve_right"), resp("gone", 1, "swerve_left", "maintain")],
  }),
];

const header = <H extends readonly string[]>(h: H, row: unknown[]) =>
  Object.fromEntries(h.map((name, i) => [name, row[i]]));

describe("computeStats", () => {
  it("counts started, completed, in progress and comprehension failures", () => {
    const s = computeStats(people, keys);
    expect(s).toMatchObject({ started: 6, completed: 4, inProgress: 2, comprehensionFailures: 1 });
  });

  it("lists duplicate groups (completed only) and straight-liners (completed only)", () => {
    const s = computeStats(people, keys);
    expect(s.duplicateGroups).toHaveLength(1);
    expect(s.duplicateGroups[0].participantIds).toEqual(["a", "b"]);
    expect(s.straightLiners).toEqual(["c"]);
  });

  it("handles an empty study", () => {
    expect(computeStats([], keys)).toEqual({
      started: 0,
      completed: 0,
      inProgress: 0,
      comprehensionFailures: 0,
      duplicateGroups: [],
      straightLiners: [],
    });
  });
});

describe("responseRows", () => {
  const rows = responseRows(people, keys).map((r) => header(RESPONSES_HEADER, r));

  it("has one row per response, including served-but-unanswered ones", () => {
    expect(rows).toHaveLength(10);
    const unanswered = rows.find((r) => r.participant_id === "d" && r.scenario_id === "s01")!;
    expect(unanswered).toMatchObject({
      utilitarian_choice: null,
      answered_at: null,
      time_on_scenario_sec: null,
      utilitarian_correct: undefined,
      kantian_correct: undefined,
    });
  });

  it("uses the internal id, never the hash", () => {
    expect(JSON.stringify(rows)).not.toContain("hash-");
  });

  it("computes time on scenario from served_at to answered_at, in seconds", () => {
    const r = rows.find((r) => r.participant_id === "a" && r.scenario_id === "s01")!;
    expect(r.time_on_scenario_sec).toBe(12.5);
    expect(r.served_at).toBe(at(200).toISOString());
    expect(r.first_served_at).toBe(at(190).toISOString());
    expect(r.position).toBe(1);
  });

  it("scores each choice against the key, blank when the scenario is unknown", () => {
    const f = rows.filter((r) => r.participant_id === "f");
    expect(f[0]).toMatchObject({ scenario_id: "s01", utilitarian_correct: false, kantian_correct: false });
    expect(f[1]).toMatchObject({ scenario_id: "gone", utilitarian_correct: undefined, kantian_correct: undefined });
    const c = rows.find((r) => r.participant_id === "c" && r.scenario_id === "s02")!;
    expect(c).toMatchObject({ utilitarian_correct: false, kantian_correct: true });
  });
});

describe("participantRows", () => {
  const rows = Object.fromEntries(
    participantRows(people, keys).map((r) => {
      const o = header(PARTICIPANTS_HEADER, r);
      return [o.participant_id as string, o];
    }),
  );

  it("exports demographics with the spec's age values", () => {
    expect(rows.a).toMatchObject({ age_range: "25_34", country: "GB", drives: "yes", ethics_coursework: "some" });
    expect(rows.e).toMatchObject({ age_range: undefined, country: null });
  });

  it("reports status, progress and total time", () => {
    expect(rows.a).toMatchObject({ status: "completed", scenarios_answered: 2, scenarios_total: 2, total_time_sec: 600 });
    expect(rows.d).toMatchObject({ status: "in_progress", scenarios_answered: 1, total_time_sec: null, completed_at: null });
  });

  it("flags duplicates and straight-lining only for completed participants", () => {
    expect(rows.a.duplicate_group).toBe(rows.b.duplicate_group);
    expect(rows.a.duplicate_group).toBeTruthy();
    expect(rows.c).toMatchObject({ duplicate_group: null, straight_liner: true });
    expect(rows.a.straight_liner).toBe(false);
    expect(rows.d).toMatchObject({ duplicate_group: null, straight_liner: null });
  });

  it("formats agreement to 2 decimals, blank (null) when nothing was scored", () => {
    expect(rows.a).toMatchObject({ utilitarian_agreement_pct: "100.00", kantian_agreement_pct: "100.00" });
    expect(rows.c).toMatchObject({ utilitarian_agreement_pct: "0.00", kantian_agreement_pct: "100.00" });
    // f: the removed scenario is excluded, so only s01 counts
    expect(rows.f).toMatchObject({ utilitarian_agreement_pct: "0.00", kantian_agreement_pct: "0.00" });
    expect(rows.e).toMatchObject({ utilitarian_agreement_pct: null, kantian_agreement_pct: null });
  });

  it("never includes the participant hash", () => {
    expect(JSON.stringify(rows)).not.toContain("hash-");
  });
});
