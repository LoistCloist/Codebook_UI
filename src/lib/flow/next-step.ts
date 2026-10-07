// Owner: Agent 3. Pure module: no Prisma client, Next or env imports (type-only imports are fine).
import type { Participant } from "@/generated/prisma/client";

export type Step =
  | { kind: "consent" }
  | { kind: "demographics" }
  | { kind: "primer" }
  | { kind: "scenario"; scenarioId: string; position: number; total: number }
  | { kind: "completed" };

/**
 * First incomplete step: consent → demographics → primer (done once the
 * comprehension check is submitted) → next unanswered scenario in the stored
 * order → completed. `answeredCount` = number of responses with answered_at set;
 * answers are saved strictly in order, so it is also the next 0-based position.
 */
export function getNextStep(p: Participant | null, answeredCount: number): Step {
  if (!p) return { kind: "consent" };
  if (p.completedAt) return { kind: "completed" };
  if (!p.demographicsAt) return { kind: "demographics" };
  if (!p.primerCompletedAt) return { kind: "primer" };
  const total = p.scenarioOrder.length;
  const position = Math.max(0, Math.trunc(answeredCount));
  if (position < total) {
    return {
      kind: "scenario",
      scenarioId: p.scenarioOrder[position],
      position,
      total,
    };
  }
  return { kind: "completed" };
}

/** "/", "/demographics", "/primer", "/scenario", "/completed" */
export function stepToPath(s: Step): string {
  switch (s.kind) {
    case "consent":
      return "/";
    case "demographics":
      return "/demographics";
    case "primer":
      return "/primer";
    case "scenario":
      return "/scenario";
    case "completed":
      return "/completed";
  }
}
