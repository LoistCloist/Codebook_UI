# Agent 2: Auth handoff

## Done
- `src/auth.ts`: `NextAuth(() => config)` (lazy, so importing it never validates env). It exports `handlers`, `auth`, `signIn` and `signOut`.
  - Google provider, `session.strategy: "jwt"` with the default 30-day maxAge. There is **no adapter**.
  - `secret` comes from `NEXTAUTH_SECRET`, and `trustHost: true` is set (NEXTAUTH_URL is required, and next-auth rewrites request URLs to it).
  - `debug: false`. A custom `logger` prints only the error type/name and warning codes, never metadata or profile data. `debug()` is a no-op.
- `src/app/api/auth/[...nextauth]/route.ts`: `export const { GET, POST } = handlers`.
- `src/lib/auth/callbacks.ts` (pure, dependency-injected):
  - **`jwt`, at sign-in:** returns `{ participantHash, isAdmin }` only. The hash comes from `account.providerAccountId`, falling back to `profile.sub`. `isAdmin` is `profile.email_verified === true` plus membership in ADMIN_EMAILS.
  - **`jwt`, later calls:** rebuilds the token from those two claims, so name, email, picture and **sub** are all dropped. A token without a hash returns `null`, which means no session.
  - **`session`:** returns `{ expires, participantHash, isAdmin }` with no `user` object.
- `src/lib/auth/admin-emails.ts`: `parseAdminEmails` (split on commas, trim, lowercase, drop blanks) and `isAdminEmail`.
- `src/lib/auth/next-auth.d.ts`: adds `participantHash` and `isAdmin` to `Session` and `JWT`.
- `src/lib/auth/hash.ts`: `participantHash(sub)` = HMAC-SHA256(PARTICIPANT_HASH_SECRET, sub) as hex. `participantHashWithSecret(secret, sub)` is also exported for tests.
- `src/lib/auth/consent-cookie.ts`:
  - The `consent_intent` value is `<expiresAtMs>.<base64url HMAC-SHA256(NEXTAUTH_SECRET, "consent_intent:"+expiresAtMs)>`.
  - The cookie is httpOnly, SameSite=Lax, `path=/`, maxAge 30 min, and `secure` in production.
  - `readConsentIntent()` verifies it with `timingSafeEqual` and rejects values that are expired, tampered with, or have an expiry more than 31 min ahead.
  - The file also exports `setConsentIntent()` and an optional `clearConsentIntent()`. Both can be called only from a server action or route handler.
- `src/lib/auth/actions.ts` (`"use server"`):
  - `consentAndSignIn(formData)` and `signOutAction()`. See the contract below.
  - `signOutAction` works directly as `<form action={signOutAction}>`.
- `src/lib/auth/session.ts`: `getParticipantHash()` (null when signed out), `isAdmin()`, and `requireAdmin()` (calls `notFound()`).
- Tests in `tests/unit/auth/` (27 tests):
  - hash: deterministic, secret- and subject-dependent, matches the RFC 4231 vector, uses the env secret
  - admin email parsing
  - jwt/session callbacks: no email, name, image, sub or `user` in the output; `email_verified` is required for admin
  - consent cookie: sign/verify, tampering, expiry, and a set/read/clear round trip with a mocked `next/headers`

## Contract for Agent 4 (landing and sign-out forms)
- The landing `<form action={consentAndSignIn}>` checkbox **must be named `consent`**. Any non-empty value counts, so the default `"on"` is fine.
- If `consent` is missing, the action does `redirect("/?error=consent")`, and the landing page should show an error for `?error=consent`.
- If it is present, the action sets `consent_intent` and redirects to Google, then back to `/study`.
- Sign out: `<form action={signOutAction}><button>Sign out</button></form>` redirects to `/`.

## Not done
- There's no end-to-end browser test of the Google round trip, because it needs real Google credentials.
- I smoke-tested a production build with `next start -p 3002`:
  - `/api/auth/providers` lists google with callback `/api/auth/callback/google`.
  - `/api/auth/session` returns `null` when signed out.
  - `/api/auth/csrf` returns 200.
- I didn't add a proxy/middleware, since none is needed. Pages and routes call the session helpers themselves.

## Decisions made
1. The raw Google `sub` is also dropped from the token, because it identifies a person too. Only the HMAC is kept.
2. Admin also requires `email_verified === true` (approved by the user).
3. Session lifetime is the Auth.js default of 30 days, and scopes are Google's defaults (`openid email profile`). The email is read only inside the jwt callback.
4. The consent cookie is not cleared after the participant is created, so it simply expires after 30 min. Calling `clearConsentIntent()` is optional.
5. `trustHost: true`: next-auth core only trusts the host automatically when `AUTH_URL` is set, and this project uses `NEXTAUTH_URL`.

## Requested changes
- None required.
- Optional for Agent 6: `.env.example` says to generate secrets with `openssl rand -base64 32`, while env.ts's error message says `openssl rand -hex 32`. Both satisfy the 32-character minimum, so this is cosmetic.

## How to verify
```bash
npm run typecheck && npm test && npm run lint && npm run build
# smoke: npm run build && npx next start -p 3002, then
curl localhost:3002/api/auth/providers   # google listed
curl localhost:3002/api/auth/session     # null when signed out
```
Manual check with real Google credentials (redirect URI `http://localhost:3000/api/auth/callback/google`):
1. Tick consent and sign in.
2. `/api/auth/session` shows only `expires`, `participantHash` and `isAdmin`.
3. The `authjs.session-token` cookie is an encrypted JWE, and the server log shows no email.
