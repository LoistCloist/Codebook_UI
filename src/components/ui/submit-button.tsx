"use client";

import { useFormStatus } from "react-dom";

type Props = { children: React.ReactNode; pending?: boolean; pendingLabel?: string };

/**
 * Primary submit button. `pending` covers fetch-based forms; useFormStatus covers
 * forms bound to a server action.
 */
export function SubmitButton({ children, pending, pendingLabel = "Saving…" }: Props) {
  const status = useFormStatus();
  const busy = pending || status.pending;
  return (
    <button
      type="submit"
      disabled={busy}
      aria-disabled={busy}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-lane px-7 py-2 font-mono text-[13.5px] font-semibold text-lane-ink hover:bg-lane-strong disabled:cursor-wait disabled:opacity-70 sm:w-auto"
    >
      {busy ? pendingLabel : <>{children} <span aria-hidden="true">→</span></>}
    </button>
  );
}
