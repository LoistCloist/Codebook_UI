import { db } from "@/lib/db";
import { study } from "@/config/study";
import { ResponseInput } from "@/lib/schemas";
import { guardWrite, wrongStep } from "@/lib/flow/guard";
import { fail, issueFields, ok } from "@/lib/http";

// Owner: Agent 3. Saves the answer to the current scenario (§3.7). Answers are final.
export async function POST(req: Request): Promise<Response> {
  const guard = await guardWrite(req, (state) => (state.step.kind === "scenario" ? null : wrongStep(state)));
  if (!guard.ok) return guard.response;

  const parsed = ResponseInput.safeParse(guard.body);
  if (!parsed.success)
    return fail(422, "validation", {
      fields: issueFields(parsed.error.issues),
    });
  const input = parsed.data;

  // own/confidence are required iff their flag is on, and rejected when it's off.
  const flagErrors: string[] = [];
  if (study.askOwnChoice !== (input.own !== undefined)) flagErrors.push("own");
  if (study.askConfidence !== (input.confidence !== undefined)) flagErrors.push("confidence");
  if (flagErrors.length > 0) return fail(422, "validation", { fields: flagErrors });

  const { participant, step } = guard.state;
  if (step.kind !== "scenario") return wrongStep(guard.state); // narrowed by the guard; keeps TS happy

  if (input.scenarioId !== step.scenarioId) {
    const earlier = await db.response.findUnique({
      where: {
        participantId_scenarioId: {
          participantId: participant.id,
          scenarioId: input.scenarioId,
        },
      },
      select: { answeredAt: true },
    });
    return earlier?.answeredAt ? fail(409, "already_answered", { next: "/scenario" }) : wrongStep(guard.state);
  }

  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const saved = await tx.response.updateMany({
      where: {
        participantId: participant.id,
        scenarioId: step.scenarioId,
        position: step.position,
        answeredAt: null,
      },
      data: {
        utilitarianChoice: input.utilitarian,
        kantianChoice: input.kantian ?? null,
        ownChoice: input.own ?? null,
        confidence: input.confidence ?? null,
        answeredAt: now,
      },
    });
    if (saved.count === 0) return { saved: false as const, completed: false };

    const answered = await tx.response.count({
      where: { participantId: participant.id, answeredAt: { not: null } },
    });
    if (answered < participant.scenarioOrder.length) return { saved: true as const, completed: false };

    await tx.participant.updateMany({
      where: { id: participant.id, completedAt: null },
      data: { completedAt: now },
    });
    return { saved: true as const, completed: true };
  });

  if (!result.saved) {
    const row = await db.response.findUnique({
      where: {
        participantId_scenarioId: {
          participantId: participant.id,
          scenarioId: step.scenarioId,
        },
      },
      select: { answeredAt: true },
    });
    // Answered by a concurrent request → 409; never served (no row) → wrong step.
    return row?.answeredAt ? fail(409, "already_answered", { next: "/study" }) : wrongStep(guard.state);
  }

  return ok(result.completed ? "/debrief" : "/scenario");
}
