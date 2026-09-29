import "server-only";
import { notFound } from "next/navigation";
import { auth } from "@/auth";

/** Participant hash for the signed-in user; null = not signed in. */
export async function getParticipantHash(): Promise<string | null> {
  const session = await auth();
  return session?.participantHash || null;
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.isAdmin === true;
}

/** Calls notFound() if the current user is not an admin. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) notFound();
}
