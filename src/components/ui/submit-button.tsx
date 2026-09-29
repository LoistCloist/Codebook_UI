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
      className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-6 py-2 text-base font-semibold text-white hover:bg-accent-strong disabled:cursor-wait disabled:opacity-80 sm:w-auto"
    >
      {busy ? pendingLabel : children}
    </button>
  );
}
