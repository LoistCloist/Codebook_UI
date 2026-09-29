import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ensureParticipant } from "@/lib/flow/participant";
import { stepToPath } from "@/lib/flow/next-step";

// Owner: Agent 3. Redirect-only router: creates the participant on the first
// authenticated visit (if consent was given) and sends them to their current step.
export default async function StudyPage(): Promise<never> {
  await connection(); // always per-request, never prerendered
  const current = await ensureParticipant();
  redirect(current ? stepToPath(current.step) : "/");
}
