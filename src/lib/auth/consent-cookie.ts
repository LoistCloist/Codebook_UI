import "server-only";

// Contract stub (Agent 0). Owner: Agent 2 — replace the body, keep the signature.

/** True if a valid signed consent_intent cookie is present (§3.4). */
export async function readConsentIntent(): Promise<boolean> {
  throw new Error("NOT_IMPLEMENTED: owned by Agent 2");
}
