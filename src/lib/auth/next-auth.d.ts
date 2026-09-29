// Session/JWT shape (§3.3): only participantHash and isAdmin. No email, name, picture or sub.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    participantHash: string;
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    participantHash?: string;
    isAdmin?: boolean;
  }
}
