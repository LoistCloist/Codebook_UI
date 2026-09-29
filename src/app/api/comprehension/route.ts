import { db } from "@/lib/db";
import { study } from "@/config/study";
import { COMPREHENSION_CORRECT } from "@/config/comprehension-answers";
import { ComprehensionInput } from "@/lib/schemas";
import { getNextStep, stepToPath } from "@/lib/flow/next-step";
import { guardWrite, wrongStep } from "@/lib/flow/guard";
import { fail, issueFields, ok } from "@/lib/http";

// Owner: Agent 3. Submitting the comprehension check completes the primer:
// comprehension_answers, comprehension_passed and primer_completed_at are set together, once.
export async function POST(req: Request): Promise<Response> {
  const guard = await guardWrite(req, (state) => {
    if (state.participant.primerCompletedAt) {
      return fail(409, "already_submitted", { next: "/study" });
    }
    return state.step.kind === "primer" ? null : wrongStep(state);
  });
  if (!guard.ok) return guard.response;

  const parsed = ComprehensionInput.safeParse(guard.body);
  if (!parsed.success) return fail(422, "validation", { fields: issueFields(parsed.error.issues) });

  const answers = parsed.data.answers;
  const unknown = answers.flatMap((a, i) =>
    study.comprehension[i].options.some((o) => o.value === a) ? [] : [`answers.${i}`],
  );
  if (unknown.length > 0) return fail(422, "validation", { fields: unknown });

  const passed = answers.every((a, i) => a === COMPREHENSION_CORRECT[i]);
  const { participant, answeredCount } = guard.state;
  const now = new Date();
  const updated = await db.participant.updateMany({
    where: { id: participant.id, primerCompletedAt: null, demographicsAt: { not: null }, completedAt: null },
    data: { comprehensionAnswers: [...answers], comprehensionPassed: passed, primerCompletedAt: now },
  });
  if (updated.count === 0) return fail(409, "already_submitted", { next: "/study" });

  return ok(stepToPath(getNextStep({ ...participant, primerCompletedAt: now }, answeredCount)));
}
