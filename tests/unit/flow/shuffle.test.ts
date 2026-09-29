import { describe, expect, it } from "vitest";
import { randomQuestionOrder, shuffle } from "@/lib/flow/shuffle";

describe("shuffle", () => {
  it("returns a permutation and leaves the input untouched", () => {
    const input = ["a", "b", "c", "d", "e"];
    const out = shuffle(input);
    expect(input).toEqual(["a", "b", "c", "d", "e"]);
    expect([...out].sort()).toEqual(input);
  });

  it("is a Fisher–Yates walk driven by rand", () => {
    // rand always 0: swaps i with 0 for i = n-1..1
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
    // rand(max) = max-1: every swap is a no-op
    expect(shuffle([1, 2, 3, 4], (m) => m - 1)).toEqual([1, 2, 3, 4]);
  });

  it("handles empty and single-item input", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["x"])).toEqual(["x"]);
  });

  it("produces every ordering of 3 items with crypto randomness", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(shuffle([1, 2, 3]).join(""));
    expect(seen.size).toBe(6);
  });
});

describe("randomQuestionOrder", () => {
  it("maps rand to U_first / K_first", () => {
    expect(randomQuestionOrder(() => 0)).toBe("U_first");
    expect(randomQuestionOrder(() => 1)).toBe("K_first");
  });
});
