import { describe, expect, it } from "vitest";
import { DemographicsInput, ResponseInput } from "@/lib/schemas";

describe("schemas", () => {
  it("DemographicsInput accepts ISO codes and prefer_not_to_say, rejects unknown countries", () => {
    const base = { ageRange: "age_18_24", drives: "yes", ethicsCoursework: "none" };
    expect(DemographicsInput.safeParse({ ...base, country: "MM" }).success).toBe(true);
    expect(DemographicsInput.safeParse({ ...base, country: "prefer_not_to_say" }).success).toBe(true);
    expect(DemographicsInput.safeParse({ ...base, country: "XX" }).success).toBe(false);
    expect(DemographicsInput.safeParse({ ...base, country: "MM", ageRange: "18_24" }).success).toBe(false);
  });

  it("ResponseInput bounds confidence to integers 1–5", () => {
    const base = { scenarioId: "s01", utilitarian: "maintain", kantian: "swerve_left" };
    expect(ResponseInput.safeParse(base).success).toBe(true);
    expect(ResponseInput.safeParse({ ...base, confidence: 5 }).success).toBe(true);
    expect(ResponseInput.safeParse({ ...base, confidence: 6 }).success).toBe(false);
    expect(ResponseInput.safeParse({ ...base, confidence: 2.5 }).success).toBe(false);
  });
});
