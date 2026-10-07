import { describe, expect, it } from "vitest";
import { ResponseInput } from "@/lib/schemas";

describe("schemas", () => {
  it("ResponseInput bounds confidence to integers 1–5", () => {
    const base = {
      scenarioId: "s01",
      utilitarian: "maintain",
      kantian: "swerve_left",
    };
    expect(ResponseInput.safeParse(base).success).toBe(true);
    expect(ResponseInput.safeParse({ ...base, confidence: 5 }).success).toBe(true);
    expect(ResponseInput.safeParse({ ...base, confidence: 6 }).success).toBe(false);
    expect(ResponseInput.safeParse({ ...base, confidence: 2.5 }).success).toBe(false);
  });
});
