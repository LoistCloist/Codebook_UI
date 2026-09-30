import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { requireStep } from "@/components/server/require-step";
import { serveCurrentScenario } from "@/lib/flow/scenario";
import { Progress } from "@/components/ui/progress";
import { ScenarioForm } from "@/components/forms/scenario-form";
import { ScenarioDiagram } from "@/components/scenario/scenario-diagram";
import { parseScene } from "@/lib/scene";
import { CHOICE_OPTIONS, study } from "@/config/study";

export const metadata: Metadata = { title: "Scenario" };

export default async function ScenarioPage() {
  const { participant } = await requireStep("/scenario");
  const s = await serveCurrentScenario(participant.id);
  const alt = s.imageAlt ?? s.title;
  const current = s.position + 1; // position is 0-based
  // A hand-made image wins; otherwise draw the scene from the action outcomes when they parse.
  const scene = !s.image && s.actions ? parseScene(s.actions) : null;

  return (
    <div data-wide>
      <Progress current={current} total={s.total} />
      <div className="grid gap-8 min-[900px]:grid-cols-[1.15fr_1fr] min-[900px]:items-start">
        {/* Left: the scenario. On wide screens it stays in view and scrolls on its own. */}
        <article
          aria-labelledby="scenario-title"
          tabIndex={0}
          className="min-[900px]:sticky min-[900px]:top-4 min-[900px]:max-h-[calc(100dvh-2rem)] min-[900px]:overflow-y-auto min-[900px]:border-r min-[900px]:border-dashed min-[900px]:border-line-strong min-[900px]:pr-7"
        >
          <p className="mb-1 font-mono text-[11px] tracking-wide text-muted">{s.id}</p>
          <h1 id="scenario-title" className="mb-2 text-[19px] leading-snug">
            {s.title}
          </h1>
          {s.image && (
            <div className="relative mb-4 aspect-video w-full overflow-hidden rounded border border-line bg-surface">
              <Image src={s.image} alt={alt} fill sizes="(max-width: 900px) 100vw, 700px" className="object-contain" priority />
            </div>
          )}
          {scene && <ScenarioDiagram scene={scene} idPrefix={s.id} />}
          <p className="mb-4 whitespace-pre-line text-[13px] italic text-muted">{s.text}</p>

          {s.world && (
            <DetailSection id="scenario-world" heading="World state">
              <ul className="list-disc space-y-1 pl-4 text-[13px]">
                {s.world.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </DetailSection>
          )}
          {s.actions && (
            <DetailSection id="scenario-actions" heading="Actions and outcomes" plain>
              <dl className="space-y-1.5">
                {CHOICE_OPTIONS.map((o) => (
                  <div key={o.value} className="rounded border border-line bg-white px-3 py-2 text-[13px]">
                    <dt className="mr-1 inline font-semibold">{o.label}:</dt>
                    <dd className="inline">{s.actions![o.value]}</dd>
                  </div>
                ))}
              </dl>
            </DetailSection>
          )}
          {s.features && (
            <DetailSection id="scenario-features" heading="Structurally relevant moral features">
              <ul className="list-disc space-y-1 pl-4 text-[13px]">
                {s.features.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </DetailSection>
          )}
        </article>

        {/* Right: the questions. */}
        <div>
          <p className="mb-4 flex justify-end">
            <a
              href={study.rulebookPdf}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-9 items-center rounded-full border border-line-strong bg-white px-3.5 font-mono text-[12.5px] text-ink no-underline hover:bg-page hover:text-ink"
            >
              View rulebook (PDF, opens in a new tab)
            </a>
          </p>
          <ScenarioForm
            key={s.id}
            scenarioId={s.id}
            questionOrder={s.questionOrder}
            askOwnChoice={s.askOwnChoice}
            askConfidence={s.askConfidence}
            isLast={current === s.total}
          />
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  id,
  heading,
  plain,
  children,
}: {
  id: string;
  heading: string;
  /** No card background (for sections whose rows are already cards). */
  plain?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`mb-3.5 ${plain ? "" : "rounded border border-line bg-surface px-4 py-3.5"}`}
    >
      <h2 id={id} className="mb-2 font-mono text-[10.5px] font-medium uppercase tracking-wide text-muted">
        {heading}
      </h2>
      {children}
    </section>
  );
}
