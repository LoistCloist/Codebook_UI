// Contract stub (Agent 0). Owner: Agent 3 — replace the bodies, keep the signatures.
// Pure module: no Prisma client, Next or env imports (type-only imports are fine).
import type { Participant } from "@/generated/prisma/client";

export type Step =
  | { kind: "consent" }
  | { kind: "demographics" }
  | { kind: "primer" }
  | { kind: "scenario"; scenarioId: string; position: number; total: number }
  | { kind: "completed" };

export function getNextStep(p: Participant | null, answeredCount: number): Step {
  void p;
  void answeredCount;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 3");
}

/** "/", "/demographics", "/primer", "/scenario", "/completed" */
export function stepToPath(s: Step): string {
  void s;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 3");
}
