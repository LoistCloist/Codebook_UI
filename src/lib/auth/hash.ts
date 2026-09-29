import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

/** HMAC-SHA256(secret, sub), hex. Exposed separately so it can be tested with explicit secrets. */
export function participantHashWithSecret(secret: string, googleSub: string): string {
  if (!googleSub) throw new Error("participantHash: empty subject");
  return createHmac("sha256", secret).update(googleSub, "utf8").digest("hex");
}

/** HMAC-SHA256(PARTICIPANT_HASH_SECRET, sub), hex. */
export function participantHash(googleSub: string): string {
  return participantHashWithSecret(env.PARTICIPANT_HASH_SECRET, googleSub);
}
