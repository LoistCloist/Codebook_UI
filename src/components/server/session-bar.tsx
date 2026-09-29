import "server-only";
import { connection } from "next/server";
import { getParticipantHash } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";

/** Shows a "Sign out" button only when a session exists. Renders nothing else. */
export async function SessionBar() {
  await connection();
  const hash = await getParticipantHash();
  if (!hash) return null;
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="min-h-11 rounded-md px-3 text-sm font-medium text-muted underline underline-offset-2 hover:text-ink"
      >
        Sign out
      </button>
    </form>
  );
}
