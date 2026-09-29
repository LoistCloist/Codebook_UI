import type { Metadata } from "next";
import { study } from "@/config/study";
import { requireStep } from "@/components/server/require-step";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata: Metadata = { title: "Already completed" };

export default async function CompletedPage() {
  await requireStep("/completed");
  const { contact } = study;
  return (
    <>
      <PageHeading>{study.completedMessage}</PageHeading>
      <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
        <p>Each person can take part only once, so there is nothing more to do.</p>
        <p>
          If you have any questions, contact {contact.name}, {contact.institution}, at{" "}
          <a href={`mailto:${contact.email}`}>{contact.email}</a>.
        </p>
      </div>
    </>
  );
}
