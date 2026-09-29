import { describe, expect, it } from "vitest";
import { getNextStep, stepToPath, type Step } from "@/lib/flow/next-step";
import { atPrimer, atScenarios, done, participant } from "./fixtures";

describe("getNextStep", () => {
  it("no participant → consent", () => {
    expect(getNextStep(null, 0)).toEqual({ kind: "consent" });
  });

  it("new participant → demographics", () => {
    expect(getNextStep(participant(), 0)).toEqual({ kind: "demographics" });
  });

  it("demographics done, primer not → primer", () => {
    expect(getNextStep(participant(atPrimer), 0)).toEqual({ kind: "primer" });
  });

  it("primer not done blocks scenarios even if demographics done", () => {
    expect(getNextStep(participant({ primerCompletedAt: new Date() }), 0)).toEqual({ kind: "demographics" });
  });

  it("primer done, nothing answered → first scenario in stored order", () => {
    expect(getNextStep(participant(atScenarios), 0)).toEqual({
      kind: "scenario",
      scenarioId: "s02",
      position: 0,
      total: 3,
    });
  });

  it("resumes at the next unanswered scenario in stored (not ID) order", () => {
    expect(getNextStep(participant(atScenarios), 1)).toEqual({
      kind: "scenario",
      scenarioId: "s01",
      position: 1,
      total: 3,
    });
    expect(getNextStep(participant(atScenarios), 2)).toMatchObject({ scenarioId: "s03", position: 2 });
  });

  it("all answered → completed (even before completed_at is set)", () => {
    expect(getNextStep(participant(atScenarios), 3)).toEqual({ kind: "completed" });
    expect(getNextStep(participant(atScenarios), 7)).toEqual({ kind: "completed" });
  });

  it("completed_at set → completed, regardless of other fields or count", () => {
    expect(getNextStep(participant(done), 0)).toEqual({ kind: "completed" });
    expect(getNextStep(participant({ completedAt: new Date() }), 0)).toEqual({ kind: "completed" });
  });

  it("empty scenario order after primer → completed", () => {
    expect(getNextStep(participant({ ...atScenarios, scenarioOrder: [] }), 0)).toEqual({ kind: "completed" });
  });

  it("treats a negative count as 0", () => {
    expect(getNextStep(participant(atScenarios), -1)).toMatchObject({ kind: "scenario", position: 0 });
  });
});

describe("stepToPath", () => {
  const cases: [Step, string][] = [
    [{ kind: "consent" }, "/"],
    [{ kind: "demographics" }, "/demographics"],
    [{ kind: "primer" }, "/primer"],
    [{ kind: "scenario", scenarioId: "s01", position: 0, total: 2 }, "/scenario"],
    [{ kind: "completed" }, "/completed"],
  ];
  it.each(cases)("%o → %s", (step, path) => {
    expect(stepToPath(step)).toBe(path);
  });
});
