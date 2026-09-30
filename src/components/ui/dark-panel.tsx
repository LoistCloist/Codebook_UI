import type { ReactNode } from "react";

/**
 * Dark "asphalt" panel for the entry and exit screens. Re-colours links and focus rings so
 * they stay visible on the dark background.
 */
export function DarkPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-md bg-asphalt px-6 py-10 text-on-dark sm:px-10 sm:py-12 [&_:focus-visible]:outline-lane [&_a]:text-lane [&_a:hover]:text-lane-strong [&_h1]:text-white [&_h2]:text-white ${className}`}
    >
      {children}
    </div>
  );
}

/** Small mono label with a lane-yellow dot, used above dark-panel headings. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 font-mono text-xs tracking-wide text-lane">
      <span className="inline-block size-1.5 rounded-full bg-lane" aria-hidden="true" />
      {children}
    </p>
  );
}

/** Lane-yellow check circle for completion screens. */
export function CheckMark() {
  return (
    <div
      className="mb-5 flex size-10 items-center justify-center rounded-full bg-lane text-lg font-bold text-lane-ink"
      aria-hidden="true"
    >
      ✓
    </div>
  );
}
