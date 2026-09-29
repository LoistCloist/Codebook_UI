import "server-only";
import { db } from "@/lib/db";
import { study } from "@/config/study";
import { getNextStep } from "@/lib/flow/next-step";
import { countAnswered, isUniqueViolation } from "@/lib/flow/participant";
import { randomQuestionOrder } from "@/lib/flow/shuffle";
import { getScenario, toPublicScenario, type PublicScenario } from "@/lib/scenarios";

// Owner: Agent 3.

export type ServedScenario = PublicScenario & {
  position: number;
  total: number;
  questionOrder: "U_first" | "K_first";
  askOwnChoice: boolean;
  askConfidence: boolean;
};

/**
 * §3.6: creates or refreshes the current scenario's responses row and returns what the page renders.
 * First render: creates the row with null choices, first_served_at = served_at = now and a random
 * question order. Later renders before the answer: update served_at only.
 * Throws if the participant isn't on a scenario step, or if the stored order references a
 * scenario missing from data/scenarios.json (never skipped or reshuffled).
 */
export async function serveCurrentScenario(participantId: string): Promise<ServedScenario> {
  const participant = await db.participant.findUnique({ where: { id: participantId } });
  if (!participant) throw new Error("serveCurrentScenario: participant not found");

  const step = getNextStep(participant, await countAnswered(participantId));
  if (step.kind !== "scenario") {
    throw new Error(`serveCurrentScenario: participant is not on a scenario step (step: ${step.kind})`);
  }

  const scenario = getScenario(step.scenarioId);
  if (!scenario) {
    throw new Error(
      `Scenario "${step.scenarioId}" (position ${step.position}) in participant ${participantId}'s stored ` +
        `scenario_order is missing from data/scenarios.json. Restore it; orders are never reshuffled or skipped.`,
    );
  }

  const key = { participantId_scenarioId: { participantId, scenarioId: step.scenarioId } };
  const now = new Date();

  let row = await db.response.findUnique({ where: key });
  if (!row) {
    try {
      row = await db.response.create({
        data: {
          participantId,
          scenarioId: step.scenarioId,
          position: step.position,
          questionOrder: randomQuestionOrder(),
          firstServedAt: now,
          servedAt: now,
        },
      });
    } catch (err) {
      // Concurrent first render: another request created it; treat as a re-render.
      if (!isUniqueViolation(err)) throw err;
      row = await db.response.findUnique({ where: key });
      if (!row) throw err;
      await refreshServedAt(row.id, now);
    }
  } else {
    await refreshServedAt(row.id, now);
  }

  if (row.position !== step.position) {
    throw new Error(
      `serveCurrentScenario: response row for "${step.scenarioId}" has position ${row.position}, expected ${step.position}`,
    );
  }

  return {
    ...toPublicScenario(scenario),
    position: step.position,
    total: step.total,
    questionOrder: row.questionOrder,
    askOwnChoice: study.askOwnChoice,
    askConfidence: study.askConfidence,
  };
}

async function refreshServedAt(responseId: string, now: Date): Promise<void> {
  await db.response.updateMany({ where: { id: responseId, answeredAt: null }, data: { servedAt: now } });
}
