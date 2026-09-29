import { describe, expect, it } from "vitest";
import { duplicateGroupId, findDuplicateGroups } from "@/lib/quality";

const A = "s01:U=maintain,K=swerve_left|s02:U=swerve_right,K=maintain";
const B = "s01:U=maintain,K=maintain";
const C = "s01:U=swerve_left,K=swerve_left";

describe("duplicateGroupId", () => {
  it("is the first 8 hex chars of sha256(answerString) (stable, known values)", () => {
    expect(duplicateGroupId(A)).toBe("98e1c886");
    expect(duplicateGroupId(B)).toBe("5983e38a");
  });
});

describe("findDuplicateGroups", () => {
  it("groups identical strings together", () => {
    const g = findDuplicateGroups([
      { participantId: "p1", answerString: A },
      { participantId: "p2", answerString: A },
      { participantId: "p3", answerString: A },
    ]);
    expect(g.size).toBe(3);
    expect(g.get("p1")).toBe("98e1c886");
    expect(g.get("p2")).toBe("98e1c886");
    expect(g.get("p3")).toBe("98e1c886");
  });

  it("gives unique strings no group", () => {
    const g = findDuplicateGroups([
      { participantId: "p1", answerString: A },
      { participantId: "p2", answerString: B },
      { participantId: "p3", answerString: A },
      { participantId: "p4", answerString: C },
    ]);
    expect(g.has("p2")).toBe(false);
    expect(g.has("p4")).toBe(false);
    expect([...g.entries()].sort()).toEqual([
      ["p1", "98e1c886"],
      ["p3", "98e1c886"],
    ]);
  });

  it("keeps separate groups apart", () => {
    const g = findDuplicateGroups([
      { participantId: "p1", answerString: A },
      { participantId: "p2", answerString: B },
      { participantId: "p3", answerString: A },
      { participantId: "p4", answerString: B },
    ]);
    expect(g.get("p1")).toBe(g.get("p3"));
    expect(g.get("p2")).toBe(g.get("p4"));
    expect(g.get("p1")).not.toBe(g.get("p2"));
    expect(g.get("p2")).toBe("5983e38a");
  });

  it("produces the same group IDs across runs and input orders", () => {
    const input = [
      { participantId: "p1", answerString: A },
      { participantId: "p2", answerString: B },
      { participantId: "p3", answerString: A },
      { participantId: "p4", answerString: B },
    ];
    const first = findDuplicateGroups(input);
    const second = findDuplicateGroups([...input].reverse());
    for (const id of ["p1", "p2", "p3", "p4"]) expect(second.get(id)).toBe(first.get(id));
  });

  it("is exact-match only (no trimming or case folding)", () => {
    const g = findDuplicateGroups([
      { participantId: "p1", answerString: B },
      { participantId: "p2", answerString: B.toUpperCase() },
      { participantId: "p3", answerString: B + " " },
    ]);
    expect(g.size).toBe(0);
  });

  it("does not group a participant with itself", () => {
    const g = findDuplicateGroups([
      { participantId: "p1", answerString: A },
      { participantId: "p1", answerString: A },
    ]);
    expect(g.size).toBe(0);
  });

  it("never groups empty answer strings", () => {
    const g = findDuplicateGroups([
      { participantId: "p1", answerString: "" },
      { participantId: "p2", answerString: "" },
    ]);
    expect(g.size).toBe(0);
  });

  it("returns an empty map for empty input", () => {
    expect(findDuplicateGroups([]).size).toBe(0);
  });
});
