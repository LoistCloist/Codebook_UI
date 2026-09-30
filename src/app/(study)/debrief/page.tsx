import type { Metadata } from "next";
import { study } from "@/config/study";
import { requireStep } from "@/components/server/require-step";
import { CheckMark, DarkPanel } from "@/components/ui/dark-panel";

export const metadata: Metadata = { title: "Thank you" };

export default async function DebriefPage() {
  await requireStep("/completed"); // shown to participants whose step is "completed"
  const { contact } = study;
  return (
    <DarkPanel className="space-y-4 text-[15px]">
      <CheckMark />
      <h1 className="text-[28px] leading-tight sm:text-[30px]">{study.debrief.heading}</h1>
      <p>Your answers have been saved. You can now close this page.</p>
      <h2 className="pt-4 font-mono text-xs font-normal tracking-wide text-on-dark-muted">ABOUT THIS STUDY</h2>
      <p>{study.debrief.explanation}</p>
      <p>
        If you have any questions, contact {contact.name}, {contact.institution}, at{" "}
        <a href={`mailto:${contact.email}`}>{contact.email}</a>.
      </p>
    </DarkPanel>
  );
}
