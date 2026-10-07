import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { env } from "@/lib/env";
import { parseAdminEmails } from "@/lib/auth/admin-emails";
import { createCallbacks } from "@/lib/auth/callbacks";
import { participantHash } from "@/lib/auth/hash";

// §3.3: JWT sessions, no database adapter. The token/session hold only participantHash and isAdmin.
// Lazy config so importing this module never validates env (e.g. during `next build`).
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const callbacks = createCallbacks({
    hash: participantHash,
    adminEmails: parseAdminEmails(env.ADMIN_EMAILS),
  });
  return {
    providers: [
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
    ],
    secret: env.NEXTAUTH_SECRET,
    // NEXTAUTH_URL is required by env.ts and next-auth rewrites request URLs to it.
    trustHost: true,
    session: { strategy: "jwt" }, // default maxAge: 30 days
    debug: false,
    // Never print profile data or error metadata: only the error name/type and warning codes.
    logger: {
      error(error: Error) {
        const type = (error as { type?: string }).type;
        console.error(`[auth] error: ${type ?? error.name}`);
      },
      warn(code: string) {
        console.warn(`[auth] warning: ${code}`);
      },
      debug() {},
    },
    callbacks: {
      jwt: ({ token, account, profile }) => callbacks.jwt({ token, account, profile }),
      session: ({ session, token }) => callbacks.session({ session, token }),
    },
  };
});
