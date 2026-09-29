import type { Metadata } from "next";
import { requireStep } from "@/components/server/require-step";
import { PageHeading } from "@/components/ui/page-heading";
import { DemographicsForm } from "@/components/forms/demographics-form";

export const metadata: Metadata = { title: "About you" };

export default async function DemographicsPage() {
  await requireStep("/demographics");
  return (
    <>
      <PageHeading lead="A few questions about you. Every question has a “Prefer not to say” option.">
        About you
      </PageHeading>
      <DemographicsForm />
    </>
  );
}
