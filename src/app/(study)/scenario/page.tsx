import type { Metadata } from "next";
import Image from "next/image";
import { requireStep } from "@/components/server/require-step";
import { serveCurrentScenario } from "@/lib/flow/scenario";
import { Progress } from "@/components/ui/progress";
import { ScenarioForm } from "@/components/forms/scenario-form";

export const metadata: Metadata = { title: "Scenario" };

export default async function ScenarioPage() {
  const { participant } = await requireStep("/scenario");
  const s = await serveCurrentScenario(participant.id);
  // imageAlt is a requested optional schema field; fall back to the title until it exists.
  const alt = (s as { imageAlt?: string }).imageAlt ?? s.title;
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
