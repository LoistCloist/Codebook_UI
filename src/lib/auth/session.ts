import "server-only";

// Contract stub (Agent 0). Owner: Agent 2 — replace the bodies, keep the signatures.

/** Participant hash for the signed-in user; null = not signed in. */
export async function getParticipantHash(): Promise<string | null> {
  throw new Error("NOT_IMPLEMENTED: owned by Agent 2");
}

export async function isAdmin(): Promise<boolean> {
  throw new Error("NOT_IMPLEMENTED: owned by Agent 2");
}

/** Calls notFound() if the current user is not an admin. */
export async function requireAdmin(): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: owned by Agent 2");
}
