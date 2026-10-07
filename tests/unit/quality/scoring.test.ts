import { describe, expect, it } from "vitest";
import { agreement, scoreResponse, type AnswerKey, type QResponse } from "@/lib/quality";

const keys: Record<string, AnswerKey> = {
  s01: { utilitarian: ["swerve_right"], kantian: ["maintain"] },
  s02: { utilitarian: ["swerve_right"], kantian: ["maintain", "swerve_right"] },
  s03: {
    utilitarian: ["maintain", "swerve_left", "swerve_right"],
    kantian: ["swerve_left"],
  },
};

describe("scoreResponse", () => {
  it("scores single-answer keys", () => {
    expect(scoreResponse({ scenarioId: "s01", utilitarian: "swerve_right", kantian: "maintain" }, keys.s01)).toEqual({
      utilitarianCorrect: true,
      kantianCorrect: true,
    });
    expect(scoreResponse({ scenarioId: "s01", utilitarian: "maintain", kantian: "swerve_left" }, keys.s01)).toEqual({
      utilitarianCorrect: false,
      kantianCorrect: false,
    });
  });

  it("accepts any choice listed in a multi-correct key", () => {
    for (const k of ["maintain", "swerve_right"] as const) {
      expect(scoreResponse({ scenarioId: "s02", utilitarian: "maintain", kantian: k }, keys.s02)).toEqual({
        utilitarianCorrect: false,
        kantianCorrect: true,
      });
    }
    expect(
      scoreResponse(
        {
          scenarioId: "s02",
          utilitarian: "swerve_right",
          kantian: "swerve_left",
        },
        keys.s02,
      ),
    ).toEqual({ utilitarianCorrect: true, kantianCorrect: false });
  });

  it("scores the theories independently", () => {
    expect(scoreResponse({ scenarioId: "s01", utilitarian: "maintain", kantian: "swerve_right" }, keys.s01)).toEqual({
      utilitarianCorrect: false,
      kantianCorrect: false,
    });
    expect(scoreResponse({ scenarioId: "s01", utilitarian: "maintain", kantian: "maintain" }, keys.s01)).toEqual({
      utilitarianCorrect: false,
      kantianCorrect: true,
    });
  });
});

describe("agreement", () => {
  const q = (scenarioId: string, utilitarian: QResponse["utilitarian"], kantian: QResponse["kantian"]): QResponse => ({
    scenarioId,
    utilitarian,
    kantian,
  });

  it("is 100 when everything matches, 0 when nothing does", () => {
    expect(agreement([q("s01", "swerve_right", "maintain"), q("s02", "swerve_right", "swerve_right")], keys)).toEqual({
      utilitarianPct: 100,
      kantianPct: 100,
    });
    expect(agreement([q("s01", "maintain", "swerve_left"), q("s02", "maintain", "swerve_left")], keys)).toEqual({
      utilitarianPct: 0,
      kantianPct: 0,
    });
  });

  it("rounds to 2 decimals on a 0–100 scale", () => {
    // U: s01 ✓, s02 ✗, s03 ✓ (key lists every choice) = 2/3; K: s01 ✓, s02 ✓, s03 ✗ = 2/3
    const rs = [
      q("s01", "swerve_right", "maintain"),
      q("s02", "maintain", "maintain"),
      q("s03", "maintain", "maintain"),
    ];
    expect(agreement(rs, keys)).toEqual({
      utilitarianPct: 66.67,
      kantianPct: 66.67,
    });
    // U: only s03 ✓ = 1/3; K: none ✓ = 0/3
    const rs2 = [
      q("s01", "maintain", "swerve_left"),
      q("s02", "maintain", "swerve_left"),
      q("s03", "swerve_left", "maintain"),
    ];
    expect(agreement(rs2, keys)).toEqual({
      utilitarianPct: 33.33,
      kantianPct: 0,
    });
  });

  it("rounds half up consistently", () => {
    // 1/8 = 12.5%, 1/16 = 6.25%, 1/7 = 14.2857…%, 5/7 = 71.428…%
    const many = (n: number, correct: number): QResponse[] =>
      Array.from({ length: n }, (_, i) => q(`x${i}`, i < correct ? "maintain" : "swerve_left", "maintain"));
    const keysFor = (n: number) =>
      Object.fromEntries(
        Array.from({ length: n }, (_, i) => [
          `x${i}`,
          { utilitarian: ["maintain"], kantian: ["maintain"] } as AnswerKey,
        ]),
      );
    expect(agreement(many(8, 1), keysFor(8)).utilitarianPct).toBe(12.5);
    expect(agreement(many(16, 1), keysFor(16)).utilitarianPct).toBe(6.25);
    expect(agreement(many(7, 1), keysFor(7)).utilitarianPct).toBe(14.29);
    expect(agreement(many(7, 5), keysFor(7)).utilitarianPct).toBe(71.43);
    // 1/1600 = 0.0625% -> 0.06; 1/800 = 0.125% -> 0.13 (half up, no float drift)
    expect(agreement(many(1600, 1), keysFor(1600)).utilitarianPct).toBe(0.06);
    expect(agreement(many(800, 1), keysFor(800)).utilitarianPct).toBe(0.13);
  });

  it("counts multi-correct keys as correct", () => {
    expect(
      agreement([q("s02", "swerve_right", "maintain"), q("s02b", "swerve_right", "swerve_right")], {
        s02: keys.s02,
        s02b: keys.s02,
      }),
    ).toEqual({ utilitarianPct: 100, kantianPct: 100 });
  });

  it("excludes responses whose scenario has no key from both counts", () => {
    const rs = [q("s01", "swerve_right", "maintain"), q("gone", "maintain", "swerve_left")];
    expect(agreement(rs, keys)).toEqual({
      utilitarianPct: 100,
      kantianPct: 100,
    });
  });

  it("ignores inherited object keys such as toString", () => {
    expect(agreement([q("toString", "maintain", "maintain")], keys)).toEqual({
      utilitarianPct: NaN,
      kantianPct: NaN,
    });
  });

  it("returns NaN when nothing can be scored", () => {
    expect(agreement([], keys)).toEqual({
      utilitarianPct: NaN,
      kantianPct: NaN,
    });
    expect(agreement([q("gone", "maintain", "maintain")], keys)).toEqual({
      utilitarianPct: NaN,
      kantianPct: NaN,
    });
  });
});
