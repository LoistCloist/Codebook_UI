type Props = { current: number; total: number };

/** "Scenario 3 of 12" with a decorative bar. `current` is 1-based. */
export function Progress({ current, total }: Props) {
  const pct = total > 0 ? Math.round(((current - 1) / total) * 100) : 0;
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-muted">
        Scenario {current} of {total}
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
