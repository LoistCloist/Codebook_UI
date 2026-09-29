import { redirect } from "next/navigation";
import { connection } from "next/server";
import { study } from "@/config/study";
import { consentAndSignIn } from "@/lib/auth/actions";
import { getCurrentParticipant } from "@/lib/flow/participant";
import { stepToPath } from "@/lib/flow/next-step";
import { ErrorSummary } from "@/components/ui/error-summary";
import { PageHeading } from "@/components/ui/page-heading";
import { SubmitButton } from "@/components/ui/submit-button";

const ERRORS: Record<string, string> = {
  consent: "Tick the box to confirm you consent before signing in",
};

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection();
  const current = await getCurrentParticipant();
  if (current) {
    const path = stepToPath(current.step);
    if (path !== "/") redirect(path);
  }

  const { error } = await searchParams;
  const code = typeof error === "string" ? error : undefined;
  const message = code ? (ERRORS[code] ?? "Something went wrong while signing in. Please try again.") : undefined;
  const { consent, contact } = study;

  return (
    <>
      <PageHeading>{study.title}</PageHeading>
      {message && (
        <ErrorSummary items={[{ message, href: code === "consent" ? "consent" : undefined }]} />
      )}

      <section aria-labelledby="about" className="space-y-4 rounded-lg border border-line bg-surface p-5">
        <h2 id="about" className="text-lg font-semibold">
          About this study
        </h2>
        <p>{consent.purpose}</p>
        <p>
          <strong>Time needed:</strong> about {consent.estimatedMinutes} minutes.
        </p>
        <p>{consent.anonymity}</p>
        <p>{consent.rightToStop}</p>
        <p>{consent.eligibility}</p>
        <p>
          <strong>Contact:</strong> {contact.name}, {contact.institution},{" "}
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
      </section>

      <form action={consentAndSignIn} className="mt-6 space-y-6">
        <div
          className={`rounded-lg border bg-surface p-4 ${code === "consent" ? "border-danger" : "border-line"}`}
        >
          {code === "consent" && (
            <p id="consent-error" className="mb-3 text-sm font-medium text-danger">
              <span className="sr-only">Error: </span>
              {ERRORS.consent}
            </p>
          )}
          <label htmlFor="consent" className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              value="yes"
              required
              aria-invalid={code === "consent" ? true : undefined}
              aria-describedby={code === "consent" ? "consent-error" : undefined}
              className="mt-1 size-5 shrink-0 accent-accent"
            />
            <span>{consent.checkboxLabel}</span>
          </label>
        </div>
        <p className="text-sm text-muted">
          You&apos;ll sign in with Google so that each person takes part only once. We don&apos;t store your
          email address, name or profile picture.
        </p>
        <SubmitButton pendingLabel="Redirecting to Google…">Consent and sign in with Google</SubmitButton>
      </form>
    </>
  );
}
