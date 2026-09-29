import type { ReactNode } from "react";

export function PageHeading({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{children}</h1>
      {lead && <p className="mt-2 text-muted">{lead}</p>}
    </div>
  );
}
