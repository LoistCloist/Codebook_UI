import type { Metadata } from "next";
import { study } from "@/config/study";
import { requireStep } from "@/components/server/require-step";
import { CheckMark, DarkPanel } from "@/components/ui/dark-panel";

export const metadata: Metadata = { title: "Already completed" };

export default async function CompletedPage() {
  await requireStep("/completed");
  const { contact } = study;
  return (
    <DarkPanel className="space-y-4 text-[15px]">
      <CheckMark />
      <h1 className="text-[28px] leading-tight sm:text-[30px]">{study.completedMessage}</h1>
      <p>Each person can take part only once, so there is nothing more to do.</p>
      <p>
        If you have any questions, contact {contact.name}, {contact.institution}, at{" "}
        <a href={`mailto:${contact.email}`}>{contact.email}</a>.
      </p>
    </DarkPanel>
  );
}
