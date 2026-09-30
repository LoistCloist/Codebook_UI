import "server-only";
import { connection } from "next/server";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/auth/actions";

/** Shows "Sign out" (and "Admin dashboard" for admins) only when a session exists. Renders nothing else. */
export async function SessionBar() {
  await connection();
  const session = await auth();
  if (!session?.participantHash) return null;
  return (
    <div className="flex items-center gap-2">
      {session.isAdmin === true && (
        <a
          href="/admin"
          className="inline-flex min-h-9 items-center rounded-full bg-lane px-3.5 font-mono text-[12.5px] font-semibold text-lane-ink no-underline hover:bg-lane-strong hover:text-lane-ink"
        >
          Admin dashboard
        </a>
      )}
      <form action={signOutAction}>
        <button
          type="submit"
          className="min-h-11 rounded-md px-3 text-sm font-medium text-muted underline underline-offset-2 hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
