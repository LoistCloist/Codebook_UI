import "server-only";

// Contract stub (Agent 0). Owner: Agent 2 — replace the body, keep the signature.

/** HMAC-SHA256(PARTICIPANT_HASH_SECRET, sub), hex. */
export function participantHash(googleSub: string): string {
  void googleSub;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 2");
}
