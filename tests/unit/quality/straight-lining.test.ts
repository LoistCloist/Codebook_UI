import { describe, expect, it } from "vitest";
import { isStraightLiner, type QResponse } from "@/lib/quality";

const r = (scenarioId: string, utilitarian: QResponse["utilitarian"], kantian: QResponse["kantian"]): QResponse => ({
  scenarioId,
  utilitarian,
  kantian,
});

describe("isStraightLiner", () => {
  it("is true when every U and K choice is the same", () => {
    expect(isStraightLiner([r("s01", "maintain", "maintain"), r("s02", "maintain", "maintain")])).toBe(true);
    expect(isStraightLiner([r("s01", "swerve_left", "swerve_left"), r("s02", "swerve_left", "swerve_left")])).toBe(
      true,
    );
  });

  it("is true for a single response whose U and K choices match", () => {
    expect(isStraightLiner([r("s01", "swerve_right", "swerve_right")])).toBe(true);
  });

  it("is false when U is constant but K differs from it", () => {
    expect(isStraightLiner([r("s01", "maintain", "swerve_left"), r("s02", "maintain", "swerve_left")])).toBe(false);
  });

  it("is false when one choice anywhere differs", () => {
    expect(
      isStraightLiner([
        r("s01", "maintain", "maintain"),
        r("s02", "maintain", "maintain"),
        r("s03", "maintain", "swerve_right"),
      ]),
    ).toBe(false);
    expect(isStraightLiner([r("s01", "maintain", "maintain"), r("s02", "swerve_left", "maintain")])).toBe(false);
  });

  it("is false for empty input", () => {
    expect(isStraightLiner([])).toBe(false);
  });
});
