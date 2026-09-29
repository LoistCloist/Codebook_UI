import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { requireStep } from "@/components/server/require-step";
import { serveCurrentScenario } from "@/lib/flow/scenario";
import { Progress } from "@/components/ui/progress";
import { ScenarioForm } from "@/components/forms/scenario-form";
import { CHOICE_OPTIONS, study } from "@/config/study";

export const metadata: Metadata = { title: "Scenario" };

export default async function ScenarioPage() {
  const { participant } = await requireStep("/scenario");
  const s = await serveCurrentScenario(participant.id);
  const alt = s.imageAlt ?? s.title;
  const current = s.position + 1; // position is 0-based

  return (
    <>
      <Progress current={current} total={s.total} />
      <article aria-labelledby="scenario-title" className="mb-8 rounded-lg border border-line bg-surface p-5">
        <h1 id="scenario-title" className="mb-3 text-2xl font-bold leading-tight">
          {s.title}
        </h1>
        {s.image && (
          <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-md bg-page">
            <Image src={s.image} alt={alt} fill sizes="(max-width: 672px) 100vw, 640px" className="object-contain" priority />
          </div>
        )}
        <p className="whitespace-pre-line">{s.text}</p>

        {s.world && (
          <DetailSection id="scenario-world" heading="World state">
            <ul className="list-disc space-y-1 pl-5">
              {s.world.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </DetailSection>
        )}
        {s.actions && (
          <DetailSection id="scenario-actions" heading="Actions and outcomes">
            <dl className="space-y-1">
              {CHOICE_OPTIONS.map((o) => (
                <div key={o.value}>
                  <dt className="inline font-semibold">{o.label}:</dt> <dd className="inline">{s.actions![o.value]}</dd>
                </div>
              ))}
            </dl>
          </DetailSection>
        )}
        {s.features && (
          <DetailSection id="scenario-features" heading="Structurally relevant moral features">
            <ul className="list-disc space-y-1 pl-5">
              {s.features.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </DetailSection>
        )}

        <p className="mt-4 text-sm">
          <a href={study.rulebookPdf} target="_blank" rel="noopener">
            Open the ethical rulebook (PDF, opens in a new tab)
          </a>
        </p>
      </article>
      <ScenarioForm
        key={s.id}
        scenarioId={s.id}
        questionOrder={s.questionOrder}
        askOwnChoice={s.askOwnChoice}
        askConfidence={s.askConfidence}
        isLast={current === s.total}
      />
    </>
  );
}

function DetailSection({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-4 rounded-md border border-line p-4">
      <h2 id={id} className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
        {heading}
      </h2>
      {children}
    </section>
  );
}
