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
});
