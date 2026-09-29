"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { setConsentIntent } from "./consent-cookie";

/**
 * Landing-form server action (§3.4). The form's checkbox MUST be named `consent`.
 * Unticked -> redirect("/?error=consent"). Ticked -> set consent_intent cookie, then Google sign-in.
 */
export async function consentAndSignIn(formData: FormData): Promise<void> {
  const consent = formData.get("consent");
  if (typeof consent !== "string" || consent.length === 0) {
    redirect("/?error=consent");
  }
  await setConsentIntent();
  // Throws a redirect (NEXT_REDIRECT) to Google: must not be wrapped in try/catch.
  await signIn("google", { redirectTo: "/study" });
}

/** Usable directly as <form action={signOutAction}>. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
