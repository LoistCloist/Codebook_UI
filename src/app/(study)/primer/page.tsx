import type { Metadata } from "next";
import { study } from "@/config/study";
import { requireStep } from "@/components/server/require-step";
import { PageHeading } from "@/components/ui/page-heading";
import { ComprehensionForm } from "@/components/forms/comprehension-form";

export const metadata: Metadata = { title: "Utilitarian ethics" };

export default async function PrimerPage() {
  await requireStep("/primer");
  return (
    <>
      <PageHeading lead="Please read these rules carefully. Every scenario asks you to apply them.">
        Utilitarian ethics
      </PageHeading>

      <ol className="space-y-4">
        {study.primer.rules.map((rule, i) => (
          <li
            key={rule.title}
            aria-labelledby={`rule-${i + 1}`}
            className="rounded-md border border-t-4 border-line-strong border-t-util bg-surface px-6 py-6 sm:px-8"
          >
            <p className="mb-2 font-mono text-xs tracking-wide text-util">RULE {i + 1}</p>
            <h2 id={`rule-${i + 1}`} className="mb-2 text-2xl leading-snug">
              {rule.title}
            </h2>
            <p className="text-lg leading-relaxed">{rule.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4">
        The full rules are in the{" "}
        <a href={study.rulebookPdf} target="_blank" rel="noopener">
          ethical rulebook (PDF, opens in a new tab)
        </a>
        . It is also shown next to every scenario.
      </p>

      <h2 className="mb-2 mt-10 border-t border-dashed border-line-strong pt-8 text-xl">Check your understanding</h2>
      <p className="mb-4 text-muted">Two quick questions about the rules above.</p>
      <ComprehensionForm />
    </>
  );
}
