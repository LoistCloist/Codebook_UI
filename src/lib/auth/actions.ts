"use server";

// Contract stub (Agent 0). Owner: Agent 2 — replace the bodies, keep the signatures.

/** Landing-form server action (§3.4): check consent, set consent_intent cookie, signIn("google"). */
export async function consentAndSignIn(formData: FormData): Promise<void> {
  void formData;
  throw new Error("NOT_IMPLEMENTED: owned by Agent 2");
}

export async function signOutAction(): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: owned by Agent 2");
}
