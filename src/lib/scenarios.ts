import "server-only";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Choice } from "@/lib/schemas";

const TheoryKey = z
  .array(Choice)
  .min(1, "answerKey arrays need at least one correct choice")
  .refine((a) => new Set(a).size === a.length, "answerKey arrays must not repeat a choice");

export const ScenarioSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/, "id may only contain letters, digits, _ and -"),
  title: z.string().trim().min(1),
  text: z.string().trim().min(1),
  image: z
    .string()
    .regex(/^\/scenarios\/[^/].*$/, 'image must be a path under /scenarios/ (e.g. "/scenarios/s01.png")')
    .refine((p) => !p.split("/").includes(".."), "image path must not contain ..")
    .optional(),
  /** Alt text for the image; the page falls back to the title when absent. */
  imageAlt: z.string().trim().min(1).optional(),
  answerKey: z.strictObject({ utilitarian: TheoryKey, kantian: TheoryKey }),
});

export const ScenariosFileSchema = z
  .array(ScenarioSchema)
  .min(1, "at least one scenario is required")
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((s, i) => {
      if (seen.has(s.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `duplicate id "${s.id}"` });
      seen.add(s.id);
    });
  });

export type Scenario = z.infer<typeof ScenarioSchema>;
/** The only scenario shape that may reach the client (no answerKey). */
export type PublicScenario = { id: string; title: string; text: string; image?: string; imageAlt?: string };

export const SCENARIOS_PATH = path.join(process.cwd(), "data", "scenarios.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Parses and validates raw scenario data. Throws one error describing every problem. */
export function parseScenarios(raw: unknown, opts: { publicDir?: string } = {}): Scenario[] {
  const result = ScenariosFileSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - [${i.path.join(".") || "(root)"}] ${i.message}`)
      .join("\n");
    throw new Error(`data/scenarios.json is malformed:\n${problems}`);
  }
  if (opts.publicDir) {
    for (const s of result.data) {
      if (s.image && !fs.existsSync(path.join(opts.publicDir, s.image))) {
        throw new Error(`data/scenarios.json is malformed:\n  - [${s.id}.image] file not found: public${s.image}`);
      }
    }
  }
  return result.data;
}

/** Reads, parses and validates a scenarios file. */
export function loadScenariosFile(filePath: string, opts: { publicDir?: string } = {}): Scenario[] {
  const text = fs.readFileSync(filePath, "utf8");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(`data/scenarios.json is not valid JSON: ${(err as Error).message}`);
  }
  return parseScenarios(raw, opts);
}

let cache: { list: Scenario[]; byId: Map<string, Scenario> } | undefined;

// zod-validated, cached; throws loudly if malformed
export function getScenarios(): Scenario[] {
  if (!cache) {
    const list = loadScenariosFile(SCENARIOS_PATH, { publicDir: PUBLIC_DIR });
    cache = { list, byId: new Map(list.map((s) => [s.id, s])) };
  }
  return cache.list;
}

export function getScenario(id: string): Scenario | undefined {
  getScenarios();
  return cache!.byId.get(id);
}

export function toPublicScenario(s: Scenario): PublicScenario {
  // Explicit allow-list: answerKey (and any future private field) never reaches the client.
  const pub: PublicScenario = { id: s.id, title: s.title, text: s.text };
  if (s.image !== undefined) pub.image = s.image;
  if (s.imageAlt !== undefined) pub.imageAlt = s.imageAlt;
  return pub;
}
