import "server-only";
import type { PublicScenario } from "@/lib/scenarios";

// Contract stub (Agent 0). Owner: Agent 3 — replace the body, keep the signature.

export type ServedScenario = PublicScenario & {
  position: number;
  total: number;
  questionOrder: "U_first" | "K_first";
  askOwnChoice: boolean;
  askConfidence: boolean;
};

/** §3.6: creates or refreshes the current scenario's responses row and returns what the page renders. */
export async function serveCurrentScenario(participantId: string): Promise<ServedScenario> {
  void participantId;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 3");
}
