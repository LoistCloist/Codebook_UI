import { describe, expect, it } from "vitest";
import { getScenarios } from "@/lib/scenarios";
import { describeScene, groupSize, parseScene } from "@/lib/scene";

const actions = (maintain: string, swerve_left: string, swerve_right = "kills 2 passengers in the AV") => ({
  maintain,
  swerve_left,
  swerve_right,
});

describe("parseScene", () => {
  it("parses people lists with and without the Oxford comma", () => {
    const s = parseScene(
      actions(
        "kills 2 adult pedestrians, 1 child pedestrian, and 1 cyclist ahead",
        "kills 1 adult pedestrian and 1 motorcyclist on the left",
      ),
    )!;
    expect(s.ahead).toEqual({
      kind: "people",
      figures: [
        { type: "adult", count: 2, label: "adult pedestrian" },
        { type: "child", count: 1, label: "child pedestrian" },
        { type: "cyclist", count: 1, label: "cyclist" },
      ],
    });
    expect(s.left).toEqual({
      kind: "people",
      figures: [
        { type: "adult", count: 1, label: "adult pedestrian" },
        { type: "motorcyclist", count: 1, label: "motorcyclist" },
      ],
    });
    expect(s.passengers).toBe(2);
  });

  it("maps special road users and keeps unknown ones as generic people", () => {
    const s = parseScene(
      actions("kills 1 road construction worker and 1 alien ahead", "kills 1 teenage cyclist on the left"),
    )!;
    expect(s.ahead).toEqual({
      kind: "people",
      figures: [
        { type: "worker", count: 1, label: "road construction worker" },
        { type: "person", count: 1, label: "alien" },
      ],
    });
    expect(s.left).toEqual({ kind: "people", figures: [{ type: "cyclist", count: 1, label: "teenage cyclist" }] });
  });

  it("recognises vehicles with occupants", () => {
    expect(
      parseScene(actions("kills 1 child pedestrian ahead", "kills 3 vehicle occupants on the left"))!.left,
    ).toEqual({
      kind: "vehicle",
      vehicle: "car",
      occupants: 3,
    });
    expect(
      parseScene(actions("kills 1 child pedestrian ahead", "kills 2 motorcycle riders on the left"))!.left,
    ).toEqual({
      kind: "vehicle",
      vehicle: "motorcycle",
      occupants: 2,
    });
  });

  it("accepts a single passenger", () => {
    expect(
      parseScene(actions("kills 1 cyclist ahead", "kills 1 cyclist on the left", "kills 1 passenger in the AV"))!
        .passengers,
    ).toBe(1);
  });

  it("returns null for anything it doesn't recognise", () => {
    expect(parseScene(actions("kills 2 ahead", "kills 1 on the left"))).toBeNull();
    expect(parseScene(actions("hits a pedestrian", "kills 1 cyclist on the left"))).toBeNull();
    expect(parseScene(actions("kills 1 cyclist ahead", "kills 1 cyclist on the right"))).toBeNull();
    expect(parseScene(actions("kills 1 cyclist ahead", "kills 1 cyclist on the left", "kills 1 passenger"))).toBeNull();
    expect(parseScene(actions("kills 0 cyclists ahead", "kills 1 cyclist on the left"))).toBeNull();
  });

  it("describes the scene in words", () => {
    const s = parseScene(
      actions(
        "kills 1 adult pedestrian and 1 cyclist ahead",
        "kills 3 vehicle occupants on the left",
        "kills 1 passenger in the AV",
      ),
    )!;
    expect(describeScene(s)).toBe(
      "Top-down road diagram. Directly ahead of the AV: 1 adult pedestrian and 1 cyclist. " +
        "To the left: a car with 3 occupants. To the right: a rigid barrier. The AV carries 1 passenger.",
    );
  });
});

describe("every scenario in data/scenarios.json gets a diagram", () => {
  const TITLE =
    /^(\d+) \S+ \S+ on current path vs (\d+) .+ on diverted path vs (\d+) passengers? in self-sacrifice path$/;

  it.each(getScenarios().map((s) => [s.id, s] as const))("%s parses and matches its title", (_id, s) => {
    expect(s.actions).toBeDefined();
    const scene = parseScene(s.actions!);
    expect(scene).not.toBeNull();
    const m = TITLE.exec(s.title);
    expect(m, `title didn't match the expected pattern: ${s.title}`).not.toBeNull();
    expect([groupSize(scene!.ahead), groupSize(scene!.left), scene!.passengers]).toEqual([
      Number(m![1]),
      Number(m![2]),
      Number(m![3]),
    ]);
  });
});
