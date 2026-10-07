import { db } from "@/lib/db";
import { DemographicsInput } from "@/lib/schemas";
import { getNextStep, stepToPath } from "@/lib/flow/next-step";
import { guardWrite, wrongStep } from "@/lib/flow/guard";
import { fail, issueFields, ok } from "@/lib/http";

// Owner: Agent 3. Demographics can be saved once (409 afterwards).
export async function POST(req: Request): Promise<Response> {
  const guard = await guardWrite(req, (state) => {
    if (state.participant.demographicsAt) {
      return fail(409, "already_submitted", { next: "/study" });
    }
    return state.step.kind === "demographics" ? null : wrongStep(state);
  });
  if (!guard.ok) return guard.response;

  const parsed = DemographicsInput.safeParse(guard.body);
  if (!parsed.success)
    return fail(422, "validation", {
      fields: issueFields(parsed.error.issues),
    });

  const { participant, answeredCount } = guard.state;
  const now = new Date();
  const updated = await db.participant.updateMany({
    where: { id: participant.id, demographicsAt: null, completedAt: null },
    data: { ...parsed.data, demographicsAt: now },
  });
  if (updated.count === 0) return fail(409, "already_submitted", { next: "/study" });

  return ok(stepToPath(getNextStep({ ...participant, demographicsAt: now }, answeredCount)));
}
