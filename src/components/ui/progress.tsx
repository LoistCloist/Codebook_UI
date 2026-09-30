type Props = { current: number; total: number };

/** "Scenario 3 of 12" with a decorative bar. `current` is 1-based. */
export function Progress({ current, total }: Props) {
  const pct = total > 0 ? Math.round(((current - 1) / total) * 100) : 0;
  return (
    <div className="mb-6">
      <p className="font-mono text-xs text-muted">
        Scenario <b className="font-semibold text-ink">{current}</b> of {total}
      </p>
      <div className="mt-2 h-[3px] w-full bg-line" aria-hidden="true">
        <div className="h-full bg-lane transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
