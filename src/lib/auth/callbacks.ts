// Pure Auth.js callbacks (§3.3), built from injected dependencies so they can be unit-tested
// without env or Next.js. The token and session carry ONLY participantHash and isAdmin.
import type { Account, Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { isAdminEmail } from "./admin-emails";

export type CallbackDeps = {
  /** HMAC of the Google subject. */
  hash: (googleSub: string) => string;
  /** Normalized ADMIN_EMAILS (see parseAdminEmails). */
  adminEmails: Set<string>;
};

/** The only claims we ever put in the token. Auth.js adds iat/exp/jti itself when encoding. */
export type AppToken = { participantHash: string; isAdmin: boolean };

export function createCallbacks(deps: CallbackDeps) {
  function jwt({
    token,
    account,
    profile,
  }: {
    token: JWT;
    account?: Account | null;
    profile?: Profile;
  }): AppToken | null {
    if (account) {
      // Sign-in: derive everything here, then drop the profile data.
      const sub = account.providerAccountId || (typeof profile?.sub === "string" ? profile.sub : "");
      if (!sub) return null;
      const isAdmin = profile?.email_verified === true && isAdminEmail(profile.email, deps.adminEmails);
      return { participantHash: deps.hash(sub), isAdmin };
    }
    // Later calls: keep only our two claims (rebuilding also strips anything else).
    if (typeof token.participantHash !== "string" || !token.participantHash) return null;
    return { participantHash: token.participantHash, isAdmin: token.isAdmin === true };
  }

  function session({ session, token }: { session: Session; token: JWT }): Session {
    // Build a fresh object: never pass through session.user (name/email/image).
    return {
      expires: session.expires,
      participantHash: typeof token.participantHash === "string" ? token.participantHash : "",
      isAdmin: token.isAdmin === true,
    } as Session;
  }

  return { jwt, session };
}
