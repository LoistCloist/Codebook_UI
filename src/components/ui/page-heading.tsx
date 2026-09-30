import type { ReactNode } from "react";

export function PageHeading({ children, lead, kicker }: { children: ReactNode; lead?: ReactNode; kicker?: ReactNode }) {
  return (
    <div className="mb-6">
      {kicker && <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">{kicker}</p>}
      <h1 className="text-2xl leading-tight text-ink sm:text-[26px]">{children}</h1>
      {lead && <p className="mt-2 max-w-xl text-[15px] text-muted">{lead}</p>}
    </div>
  );
}
