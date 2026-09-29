import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Participant } from "@/generated/prisma/client";
import { getCurrentParticipant } from "@/lib/flow/participant";
import { stepToPath, type Step } from "@/lib/flow/next-step";

/**
 * Page guard for participant pages. Redirects to "/" when there is no participant,
 * or to the participant's current step when it isn't one of `allowedPaths`.
 */
export async function requireStep(
  ...allowedPaths: [string, ...string[]]
): Promise<{ participant: Participant; step: Step }> {
  await connection(); // per-request only; never prerender participant pages
  const current = await getCurrentParticipant();
  if (!current) redirect("/");
  const path = stepToPath(current.step);
  if (!allowedPaths.includes(path)) redirect(path);
  return current;
}
