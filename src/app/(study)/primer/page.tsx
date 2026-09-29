import type { Metadata } from "next";
import { study } from "@/config/study";
import { requireStep } from "@/components/server/require-step";
import { PageHeading } from "@/components/ui/page-heading";
import { ComprehensionForm } from "@/components/forms/comprehension-form";

export const metadata: Metadata = { title: "Two ethical theories" };

export default async function PrimerPage() {
  await requireStep("/primer");
  return (
    <>
      <PageHeading lead="Please read these short descriptions. The scenarios will ask you to apply both theories.">
        Two ethical theories
      </PageHeading>

      <div className="space-y-4">
        <section aria-labelledby="util" className="rounded-lg border border-line bg-surface p-5">
          <h2 id="util" className="mb-2 text-lg font-semibold">
            Utilitarianism
          </h2>
          <p>{study.primer.utilitarianism}</p>
        </section>
        <section aria-labelledby="kant" className="rounded-lg border border-line bg-surface p-5">
          <h2 id="kant" className="mb-2 text-lg font-semibold">
            Kantian ethics
          </h2>
          <p>{study.primer.kantianEthics}</p>
        </section>
      </div>
      <p className="mt-4">
        The full rules for both theories are in the{" "}
        <a href={study.rulebookPdf} target="_blank" rel="noopener">
          ethical rulebook (PDF, opens in a new tab)
        </a>
        . You can also open it from every scenario.
      </p>

      <h2 className="mb-2 mt-8 text-xl font-semibold">Check your understanding</h2>
      <p className="mb-4 text-muted">Two quick questions about the descriptions above.</p>
      <ComprehensionForm />
    </>
  );
}
