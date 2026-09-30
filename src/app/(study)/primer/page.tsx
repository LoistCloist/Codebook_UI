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

      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-labelledby="util" className="rounded-md border border-t-4 border-line-strong border-t-util bg-surface p-5">
          <p className="mb-1 font-mono text-[11px] tracking-wide text-util">RULEBOOK 1</p>
          <h2 id="util" className="mb-2 text-lg">
            Utilitarianism
          </h2>
          <p>{study.primer.utilitarianism}</p>
        </section>
        <section aria-labelledby="kant" className="rounded-md border border-t-4 border-line-strong border-t-kant bg-surface p-5">
          <p className="mb-1 font-mono text-[11px] tracking-wide text-kant">RULEBOOK 2</p>
          <h2 id="kant" className="mb-2 text-lg">
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

      <h2 className="mb-2 mt-10 border-t border-dashed border-line-strong pt-8 text-xl">Check your understanding</h2>
      <p className="mb-4 text-muted">Two quick questions about the descriptions above.</p>
      <ComprehensionForm />
    </>
  );
}
