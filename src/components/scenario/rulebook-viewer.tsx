import { study } from "@/config/study";

/** The rulebook PDF, always visible beside the question. The link covers browsers that won't show PDFs inline. */
export function RulebookViewer() {
  return (
    <section aria-labelledby="rulebook-heading" className="rounded border border-line bg-surface px-4 py-3.5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="rulebook-heading" className="font-mono text-[10.5px] font-medium uppercase tracking-wide text-muted">
          Ethical rulebook
        </h2>
        <a href={study.rulebookPdf} target="_blank" rel="noopener" className="text-[13px]">
          Open in a new tab
        </a>
      </div>
      <iframe
        src={`${study.rulebookPdf}#view=FitH`}
        title="Ethical rulebook (PDF)"
        className="h-[60vh] min-h-80 w-full rounded border border-line bg-white"
      />
    </section>
  );
}
