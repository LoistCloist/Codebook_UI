import { describe, expect, it } from "vitest";
import { buildAnswerString, type QResponse } from "@/lib/quality";

describe("buildAnswerString", () => {
  it("formats responses as id:U=..,K=.. joined by |", () => {
    const rs: QResponse[] = [
      { scenarioId: "s01", utilitarian: "maintain", kantian: "swerve_left" },
      { scenarioId: "s02", utilitarian: "swerve_right", kantian: "maintain" },
    ];
    expect(buildAnswerString(rs)).toBe("s01:U=maintain,K=swerve_left|s02:U=swerve_right,K=maintain");
  });

  it("sorts by scenario ID, not by display order", () => {
    const displayOrder: QResponse[] = [
      { scenarioId: "s03", utilitarian: "maintain", kantian: "maintain" },
      {
        scenarioId: "s01",
        utilitarian: "swerve_left",
        kantian: "swerve_right",
      },
      {
        scenarioId: "s02",
        utilitarian: "swerve_right",
        kantian: "swerve_left",
      },
    ];
    expect(buildAnswerString(displayOrder)).toBe(
      "s01:U=swerve_left,K=swerve_right|s02:U=swerve_right,K=swerve_left|s03:U=maintain,K=maintain",
    );
  });

  it("gives the same string for any permutation of the same responses", () => {
    const a: QResponse[] = [
      { scenarioId: "s01", utilitarian: "maintain", kantian: "maintain" },
      { scenarioId: "s02", utilitarian: "swerve_left", kantian: "maintain" },
      { scenarioId: "s10", utilitarian: "swerve_right", kantian: "maintain" },
    ];
    expect(buildAnswerString([a[2], a[0], a[1]])).toBe(buildAnswerString(a));
    expect(buildAnswerString([a[1], a[2], a[0]])).toBe(buildAnswerString(a));
  });

  it("uses plain code-unit order (uppercase before lowercase, lexicographic digits)", () => {
    const rs: QResponse[] = [
      { scenarioId: "b", utilitarian: "maintain", kantian: "maintain" },
      { scenarioId: "s2", utilitarian: "maintain", kantian: "maintain" },
      { scenarioId: "s10", utilitarian: "maintain", kantian: "maintain" },
      { scenarioId: "B", utilitarian: "maintain", kantian: "maintain" },
    ];
    expect(
      buildAnswerString(rs)
        .split("|")
        .map((p) => p.split(":")[0]),
    ).toEqual(["B", "b", "s10", "s2"]);
  });

  it("does not mutate its input", () => {
    const rs: QResponse[] = [
      { scenarioId: "s02", utilitarian: "maintain", kantian: "maintain" },
      { scenarioId: "s01", utilitarian: "maintain", kantian: "maintain" },
    ];
    buildAnswerString(rs);
    expect(rs.map((r) => r.scenarioId)).toEqual(["s02", "s01"]);
  });

  it("returns an empty string for empty input", () => {
    expect(buildAnswerString([])).toBe("");
  });

  it("throws on a repeated scenario ID", () => {
    expect(() =>
      buildAnswerString([
        { scenarioId: "s01", utilitarian: "maintain", kantian: "maintain" },
        { scenarioId: "s01", utilitarian: "swerve_left", kantian: "maintain" },
      ]),
    ).toThrow(/duplicate scenarioId "s01"/);
  });
});
