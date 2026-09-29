import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  SCENARIOS_PATH,
  getScenario,
  getScenarios,
  loadScenariosFile,
  parseScenarios,
  scenariosMissingKeys,
  toPublicScenario,
  type Scenario,
} from "@/lib/scenarios";

const valid = (over: Partial<Scenario> = {}) => ({
  id: "s01",
  title: "T",
  text: "Text",
  answerKey: { utilitarian: ["maintain"], kantian: ["swerve_left", "swerve_right"] },
  ...over,
});

const ACTIONS = { maintain: "kills 2 ahead", swerve_left: "kills 1 on the left", swerve_right: "kills 1 passenger" };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "scenarios-test-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));
const writeTmp = (name: string, contents: string) => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, contents);
  return p;
};

describe("scenario loader", () => {
  it("loads the real data/scenarios.json", () => {
    const list = getScenarios();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(getScenario(list[0].id)).toBe(list[0]);
    expect(getScenario("does-not-exist")).toBeUndefined();
    expect(loadScenariosFile(SCENARIOS_PATH)).toEqual(list);
  });

  it("accepts a valid file", () => {
    expect(parseScenarios([valid(), valid({ id: "s02", image: "/scenarios/s02.png" })])).toHaveLength(2);
  });

  it("accepts scenarios without an answerKey and reports them as missing keys", () => {
    const unkeyed: Record<string, unknown> = valid({ id: "s02" });
    delete unkeyed.answerKey;
    const list = parseScenarios([valid(), unkeyed]);
    expect(list[1].answerKey).toBeUndefined();
    expect(scenariosMissingKeys(list)).toEqual(["s02"]);
  });

  it("throws on a file that isn't JSON", () => {
    expect(() => loadScenariosFile(writeTmp("bad.json", "[{ id: s01"))).toThrow(/not valid JSON/);
  });

  it("throws on a malformed file", () => {
    const p = writeTmp("malformed.json", JSON.stringify([{ id: "s01", title: "T" }]));
    expect(() => loadScenariosFile(p)).toThrow(/malformed/);
  });

  it.each([
    ["empty list", []],
    ["not an array", { id: "s01" }],
    ["invalid choice", [valid({ answerKey: { utilitarian: ["brake" as never], kantian: ["maintain"] } })]],
    ["empty answerKey array", [valid({ answerKey: { utilitarian: [], kantian: ["maintain"] } })]],
    ["repeated choice in answerKey", [valid({ answerKey: { utilitarian: ["maintain", "maintain"], kantian: ["maintain"] } })]],
    ["duplicate ids", [valid(), valid()]],
    ["unknown field", [{ ...valid(), extra: 1 }]],
    ["image outside /scenarios/", [valid({ image: "/etc/passwd" })]],
    ["image path traversal", [valid({ image: "/scenarios/../x.png" })]],
    ["blank title", [valid({ title: "  " })]],
    ["empty world list", [valid({ world: [] })]],
    ["blank world line", [valid({ world: [" "] })]],
    ["empty features list", [valid({ features: [] })]],
    ["actions missing a choice", [{ ...valid(), actions: { maintain: "a", swerve_left: "b" } }]],
    ["actions with an unknown choice", [{ ...valid(), actions: { ...ACTIONS, brake: "d" } }]],
    ["answerKey with only one theory", [{ ...valid(), answerKey: { utilitarian: ["maintain"] } }]],
  ])("rejects %s", (_name, raw) => {
    expect(() => parseScenarios(raw)).toThrow(/malformed/);
  });

  it("throws when a referenced image file is missing", () => {
    expect(() => parseScenarios([valid({ image: "/scenarios/missing.png" })], { publicDir: tmp })).toThrow(
      /file not found/,
    );
  });

  it("toPublicScenario never includes answerKey", () => {
    const pub = toPublicScenario(parseScenarios([valid({ image: "/scenarios/a.png" })])[0]);
    expect(pub).toEqual({ id: "s01", title: "T", text: "Text", image: "/scenarios/a.png" });
    expect(Object.keys(toPublicScenario(parseScenarios([valid()])[0]))).toEqual(["id", "title", "text"]);
  });

  it("passes imageAlt through to the public scenario when set", () => {
    const pub = toPublicScenario(
      parseScenarios([valid({ image: "/scenarios/a.png", imageAlt: "  A car at a crossing " })])[0],
    );
    expect(pub).toEqual({
      id: "s01",
      title: "T",
      text: "Text",
      image: "/scenarios/a.png",
      imageAlt: "A car at a crossing",
    });
    expect(pub).not.toHaveProperty("answerKey");
  });

  it("omits imageAlt when absent and rejects an empty imageAlt", () => {
    expect(toPublicScenario(parseScenarios([valid()])[0])).not.toHaveProperty("imageAlt");
    expect(() => parseScenarios([valid({ imageAlt: "   " })])).toThrow(/malformed/);
    expect(() => parseScenarios([valid({ imageAlt: 5 as unknown as string })])).toThrow(/malformed/);
  });

  it("passes world, actions and features through to the public scenario", () => {
    const pub = toPublicScenario(
      parseScenarios([valid({ world: ["1 cyclist ahead"], actions: ACTIONS, features: ["Left decreases deaths"] })])[0],
    );
    expect(pub).toEqual({
      id: "s01",
      title: "T",
      text: "Text",
      world: ["1 cyclist ahead"],
      actions: ACTIONS,
      features: ["Left decreases deaths"],
    });
    expect(pub).not.toHaveProperty("answerKey");
  });
});
