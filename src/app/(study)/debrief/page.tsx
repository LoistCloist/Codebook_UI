import type { Metadata } from "next";
import { study } from "@/config/study";
import { requireStep } from "@/components/server/require-step";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "Thank you" };

export default async function DebriefPage() {
  await requireStep("/completed"); // shown to participants whose step is "completed"
  const { contact } = study;
  return (
    <>
      <PageHeading>{study.debrief.heading}</PageHeading>
      <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
        <p>Your answers have been saved. You can now close this page.</p>
        <h2 className="text-lg font-semibold">About this study</h2>
        <p>{study.debrief.explanation}</p>
        <p>
          If you have any questions, contact {contact.name}, {contact.institution}, at{" "}
          <a href={`mailto:${contact.email}`}>{contact.email}</a>.
        </p>
      </div>
    </>
  );
}
