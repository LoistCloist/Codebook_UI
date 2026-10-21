import { describe, expect, it } from "vitest";
import {
  fleissKappa,
  krippendorffAlphaNominal,
  reliabilitySummary,
  unitAgreement,
  type Units,
} from "@/lib/quality/reliability";

/** Builds units from rater rows (null = missing), as in reliability textbooks. */
function fromRaters(raters: (string | null)[][]): Units {
  const units = new Map<string, string[]>();
  raters[0].forEach((_, u) => {
    units.set(`u${u + 1}`, raters.map((r) => r[u]).filter((v): v is string => v !== null));
  });
  return units;
}

/** Builds units from per-category counts per item. */
function fromCounts(rows: number[][]): Units {
  return new Map(rows.map((row, i) => [`i${i + 1}`, row.flatMap((n, c) => Array<string>(n).fill(`c${c}`))]));
}

describe("krippendorffAlphaNominal", () => {
  it("matches Krippendorff's published example with missing data (α = 0.743)", () => {
    const _ = null;
    const units = fromRaters([
      ["1", "2", "3", "3", "2", "1", "4", "1", "2", _, _, _],
      ["1", "2", "3", "3", "2", "2", "4", "1", "2", "5", _, "3"],
      [_, "3", "3", "3", "2", "3", "4", "2", "2", "5", "1", _],
      ["1", "2", "3", "3", "2", "4", "4", "1", "2", "5", "1", _],
    ]);
    expect(krippendorffAlphaNominal(units)).toBeCloseTo(0.743, 3);
  });

  it("is 1 for perfect agreement across more than one category", () => {
    expect(krippendorffAlphaNominal(new Map([["a", ["x", "x"]], ["b", ["y", "y", "y"]]]))).toBe(1);
  });

  it("is NaN with no pairable units or only one category in use", () => {
    expect(krippendorffAlphaNominal(new Map())).toBeNaN();
    expect(krippendorffAlphaNominal(new Map([["a", ["x"]]]))).toBeNaN();
    expect(krippendorffAlphaNominal(new Map([["a", ["x", "x"]]]))).toBeNaN();
  });
});

describe("fleissKappa", () => {
  it("matches Fleiss' worked example (κ ≈ 0.210)", () => {
    const units = fromCounts([
      [0, 0, 0, 0, 14],
      [0, 2, 6, 4, 2],
      [0, 0, 3, 5, 6],
      [0, 3, 9, 2, 0],
      [2, 2, 8, 1, 1],
      [7, 7, 0, 0, 0],
      [3, 2, 6, 3, 0],
      [2, 5, 3, 2, 2],
      [6, 5, 2, 1, 0],
      [0, 2, 2, 3, 7],
    ]);
    expect(fleissKappa(units)).toBeCloseTo(0.21, 2);
    expect(reliabilitySummary(units).percentAgreement).toBeCloseTo(37.8, 1);
  });

  it("is NaN with no pairable units or when everyone picks one category", () => {
    expect(fleissKappa(new Map([["a", ["x"]]]))).toBeNaN();
    expect(fleissKappa(new Map([["a", ["x", "x"]]]))).toBeNaN();
  });
});

describe("unitAgreement", () => {
  it("reports pairwise agreement and the most common rating", () => {
    expect(unitAgreement(["b", "a", "a", "c"])).toEqual({
      n: 4,
      pairwisePct: (2 / 12) * 100,
      mode: "a",
      modeShare: 50,
    });
  });

  it("breaks ties by sort order and handles 0 or 1 rating", () => {
    expect(unitAgreement(["y", "x"]).mode).toBe("x");
    expect(unitAgreement(["x"])).toMatchObject({ n: 1, pairwisePct: NaN, mode: "x", modeShare: 100 });
    expect(unitAgreement([])).toMatchObject({ n: 0, mode: null });
  });
});

describe("reliabilitySummary", () => {
  it("counts only units with 2+ ratings", () => {
    const s = reliabilitySummary(new Map([["a", ["x", "x"]], ["b", ["y"]], ["c", ["x", "y"]]]));
    expect(s).toMatchObject({ units: 2, ratings: 4, percentAgreement: 50 });
  });
});
