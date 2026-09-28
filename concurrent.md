# Multi-agent build instructions (read with the original spec)

YOUR ROLE: Agent __  ← (set to 0–6 before sending)

You are one of 7 agents building the research app described in the original spec (attached). This document tells you **what your part is, which files you own, and the shared contracts you must code against**. Where this document and the spec conflict, this document wins. For anything neither document covers: ask the user. If you can't ask, pick the most conservative option and record it under "Decisions made" in your handoff file.

The spec's "show me your plan before writing code" rule applies to **your part only**: show the user a short plan (≤15 lines) for your slice, wait for their go-ahead, then build.

---

## 1. Waves and agents

| Wave | Agent | Slice | Starts when |
|---|---|---|---|
| 0 | **0 Foundation** | Scaffold, schema, migration, config, zod, contract stubs | Immediately, alone |
| 1 | **1 Quality logic** | Answer strings, duplicates, straight-lining, scoring | Agent 0 merged to `main` |
| 1 | **2 Auth** | Auth.js/Google, participant hash, admin check, consent-and-sign-in | Agent 0 merged |
| 1 | **3 Flow & API** | Step resolver, write endpoints, order enforcement, rate limiting | Agent 0 merged |
| 1 | **4 Participant UI** | All participant pages and components | Agent 0 merged |
| 1 | **5 Admin & seed** | Dashboard, CSV exports, seed script | Agent 0 merged |
| 2 | **6 Integration** | Merge, integration tests, README, final checks | Agents 1–5 finished |

Wave 1 agents run concurrently. They never wait for each other: they code against the contracts in §4, which Agent 0 creates as stubs.

## 2. Git workflow

- Agent 0 runs `git init`, commits to `main`, and tags `foundation`.
- Every other agent works in its own git worktree on branch `agent/<n>-<slug>` (e.g. `agent/3-flow`), created from `main` at `foundation`.
- **Only create or edit files you own (§5).** If you need a change in a file you don't own (especially `prisma/schema.prisma` or `src/lib/schemas.ts`), don't make it. Write it under "Requested changes" in your handoff file.
- If you must change a contract signature, don't. Implement the contract as written and request the change.
- Commit often, with clear messages. Don't merge other branches; Agent 6 does all merging.
- When you finish, write `HANDOFF/<n>-<slug>.md` with these sections: Done · Not done · Decisions made · Requested changes · How to verify.

## 3. Decisions (fixed for all agents)

1. **Tooling:** npm, Node 20+, the latest stable Next.js (App Router, `src/` dir, `@/*` alias), Auth.js v5 (`next-auth@5`), Prisma, zod, Vitest.
2. **Tests:** Vitest for unit tests. Integration tests run against a real Postgres test database at `TEST_DATABASE_URL`, which is added to `.env.example`. docker-compose creates both the dev and test databases.
3. **Sessions:** Auth.js **JWT strategy with no database adapter**. The adapter would store email, name and picture, so don't use it. The token and session hold only `participantHash` and `isAdmin`. Email, name and picture are dropped inside the `jwt` callback. Auth.js debug logging is off, and a custom logger never prints profile data.
4. **Consent across OAuth:** the landing form posts to a server action. The action checks the consent checkbox, sets a signed, httpOnly, SameSite=Lax cookie `consent_intent` (30 min), then calls `signIn("google", { redirectTo: "/study" })`. The participant row is created only if this cookie is valid; otherwise the user goes back to `/`. The cookie records consent only and is never used for one-response enforcement.
5. **Participant creation:** happens on the first authenticated visit to `/study`. It sets `consented_at` and `started_at`, and generates and stores `scenario_order` (a Fisher–Yates shuffle using `crypto.randomInt`) once.
6. **Serving a scenario:** the first time a participant's current scenario is rendered, a `responses` row is created with null choices, `first_served_at = served_at = now()`, and a random `question_order`. Later renders before the answer update only `served_at`; the question order never changes. **Time on scenario = `answered_at − served_at`**. `first_served_at` goes in the exports too.
7. **Saving an answer:** a single transaction that runs a conditional update (`WHERE answered_at IS NULL AND scenario_id = <expected current>`). If 0 rows are updated, it returns 409. The same transaction sets `completed_at` if this was the last position.
8. **Write endpoints:** route handlers under `src/app/api/*`, POST with a JSON body. All of them:
   - Require `Content-Type: application/json`.
   - Check that `Origin` matches `NEXTAUTH_URL`, which is CSRF protection for our own routes; Auth.js's CSRF only covers its own endpoints.
   - Validate the body with zod.
   - Re-check the participant hash and the current step on the server.
   - Return `{ ok: true, next: "<path>" }` or `{ ok: false, error: "<code>" }`, with status 401 (no session), 403 (wrong step), 409 (already answered or study completed), 422 (validation), or 429 (rate limited).
9. **Rate limiting:** a `rateLimit(key)` interface with an in-memory sliding-window implementation, keyed by participant hash (10 writes/min). The README notes that multi-instance deployments need a shared store such as Upstash.
10. **Demographics:** stored as columns using Postgres enums, except `country`, which is text: an ISO-3166 alpha-2 code or `prefer_not_to_say`, from `src/config/countries.ts`. Age ranges are `18_24 · 25_34 · 35_44 · 45_54 · 55_64 · 65_plus · prefer_not_to_say` (adults only; the consent text says so).
11. **Comprehension check:** 2 multiple-choice questions in `src/config/study.ts`. The correct answers live in a server-only module. Passing means both are correct. The submitted answers are stored as JSON.
12. **Straight-lining:** true when every utilitarian **and** Kantian choice across all of a participant's responses has the same value. The optional "own choice" is ignored.
13. **Duplicate group ID:** the first 8 hex characters of `sha256(answerString)`, assigned only when 2 or more completed participants share that string. It is `null` otherwise.
14. **Scoring:** a choice is correct if it appears in that theory's `answerKey` array for that scenario. Agreement % = correct ÷ answered, per theory.
15. **Server-only:** the scenario loader, the answer key, the comprehension answers and all DB code start with `import "server-only"`. The client only ever receives `PublicScenario`, which has no `answerKey`.

## 4. Shared contracts

Agent 0 creates each of these files with the exact signatures below and stub bodies that throw `new Error("NOT_IMPLEMENTED: owned by Agent N")`. The owner replaces the body. Nobody changes a signature.

```ts
// src/lib/schemas.ts — Agent 0 (real, not a stub)
export const Choice = z.enum(["maintain", "swerve_left", "swerve_right"]);
export const DemographicsInput = z.object({ ageRange, country, drives, ethicsCoursework }); // enums per §3.10
export const ComprehensionInput = z.object({ answers: z.tuple([z.string(), z.string()]) });
export const ResponseInput = z.object({
  scenarioId: z.string(), utilitarian: Choice, kantian: Choice,
  own: Choice.optional(), confidence: z.number().int().min(1).max(5).optional(),
}); // own/confidence required iff the matching config flag is on (checked in the route)

// src/lib/scenarios.ts — Agent 0 (real)
getScenarios(): Scenario[]              // zod-validated, cached; throws loudly if malformed
getScenario(id: string): Scenario | undefined
toPublicScenario(s: Scenario): PublicScenario   // { id, title, text, image? }

// src/lib/auth/session.ts — Agent 2
getParticipantHash(): Promise<string | null>   // null = not signed in
isAdmin(): Promise<boolean>
requireAdmin(): Promise<void>                  // calls notFound() if not admin

// src/lib/auth/hash.ts — Agent 2
participantHash(googleSub: string): string     // HMAC-SHA256(PARTICIPANT_HASH_SECRET, sub), hex

// src/lib/auth/actions.ts — Agent 2
consentAndSignIn(formData: FormData): Promise<void>   // server action, §3.4
signOutAction(): Promise<void>

// src/lib/auth/consent-cookie.ts — Agent 2
readConsentIntent(): Promise<boolean>

// src/lib/flow/next-step.ts — Agent 3
type Step =
  | { kind: "consent" } | { kind: "demographics" } | { kind: "primer" }
  | { kind: "scenario"; scenarioId: string; position: number; total: number }
  | { kind: "completed" };
getNextStep(p: Participant | null, answeredCount: number): Step   // pure
stepToPath(s: Step): string   // "/", "/demographics", "/primer", "/scenario", "/completed"

// src/lib/flow/participant.ts — Agent 3
getCurrentParticipant(): Promise<{ participant: Participant; step: Step } | null>
ensureParticipant(): Promise<{ participant: Participant; step: Step } | null>  // used by /study, §3.5

// src/lib/flow/scenario.ts — Agent 3
type ServedScenario = PublicScenario & {
  position: number; total: number; questionOrder: "U_first" | "K_first";
  askOwnChoice: boolean; askConfidence: boolean;
};
serveCurrentScenario(participantId: string): Promise<ServedScenario>   // §3.6

// src/lib/rate-limit.ts — Agent 3
rateLimit(key: string): { ok: boolean; retryAfterSec?: number }

// src/lib/quality/index.ts — Agent 1 (pure: no Prisma, Next or env imports)
type QResponse = { scenarioId: string; utilitarian: Choice; kantian: Choice };
type AnswerKey = { utilitarian: Choice[]; kantian: Choice[] };
buildAnswerString(rs: QResponse[]): string   // sorted by scenarioId: "s01:U=maintain,K=swerve_left|s02:..."
findDuplicateGroups(ps: { participantId: string; answerString: string }[]): Map<string, string> // id -> groupId, §3.13
isStraightLiner(rs: QResponse[]): boolean    // §3.12; false for empty input
scoreResponse(r: QResponse, key: AnswerKey): { utilitarianCorrect: boolean; kantianCorrect: boolean }
agreement(rs: QResponse[], keys: Record<string, AnswerKey>): { utilitarianPct: number; kantianPct: number }

// src/lib/admin/stats.ts, export.ts — Agent 5
getDashboardStats(): Promise<DashboardStats>
buildResponsesCsv(): Promise<string>
buildParticipantsCsv(): Promise<string>
```

### Prisma schema (Agent 0 writes it; everyone codes against it)

- **Enums:** `Choice`, `QuestionOrder (U_first, K_first)`, `AgeRange`, `YesNoPnts (yes, no, prefer_not_to_say)`, `EthicsCoursework (none, some, substantial, prefer_not_to_say)`
- **`Participant`:** `id` (cuid) · `participantHash` (unique) · `consentedAt` · `startedAt` · `ageRange?` · `country?` · `drives?` · `ethicsCoursework?` · `demographicsAt?` · `comprehensionAnswers Json?` · `comprehensionPassed Boolean?` · `primerCompletedAt?` · `scenarioOrder String[]` · `completedAt?`
- **`Response`:** `id` · `participantId` (FK) · `scenarioId` · `position Int` · `questionOrder` · `utilitarianChoice Choice?` · `kantianChoice Choice?` · `ownChoice Choice?` · `confidence Int?` · `firstServedAt` · `servedAt` · `answeredAt?`. Unique on `(participantId, scenarioId)` and on `(participantId, position)`.
- Use snake_case table and column names via `@@map`/`@map`.

## 5. Agent briefs and file ownership

### Agent 0: Foundation
**Owns:** everything at the repo root (`package.json`, configs, `docker-compose.yml`, `.env.example`, `.gitignore`), `prisma/schema.prisma`, `prisma/migrations/**`, `data/scenarios.json`, `public/scenarios/`, `src/config/**`, `src/lib/env.ts`, `src/lib/db.ts`, `src/lib/scenarios.ts`, `src/lib/schemas.ts`, `src/instrumentation.ts`, `vitest.config.ts`, and every stub file in §4.
**Deliver:**
- A scaffold that installs cleanly, plus npm scripts: `dev · build · lint · typecheck · test · test:integration · db:migrate · db:seed`.
- Postgres 16 in docker-compose, with the dev and test databases.
- `env.ts` validates every env var with zod.
- The Prisma schema and first migration.
- A Prisma client singleton.
- 2 placeholder scenarios.
- The scenario loader, validated at startup through `instrumentation.ts`, with a unit test showing that a malformed file throws.
- `study.ts` with placeholders for consent, primer, contact and comprehension, plus the flags `askOwnChoice: false` and `askConfidence: false`.
- `countries.ts` and all zod schemas.
- Contract stubs that compile.

**Done when** `npm run typecheck`, `npm test` and `npm run db:migrate` all pass on a fresh clone. Then tag `foundation`.

### Agent 1: Quality logic
**Owns:** `src/lib/quality/**`, `tests/unit/quality/**`.
**Deliver** the §4 functions (pure TypeScript) and thorough unit tests:
- Sorting is by scenario ID, not display order.
- Identical strings group together; unique strings get no group; group IDs are stable across runs.
- Straight-lining is true, false, or false for empty input.
- Multi-correct answer keys score correctly; agreement % rounds consistently (2 decimal places).

### Agent 2: Auth
**Owns:** `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth/**`, `tests/unit/auth/**`.
**Deliver:**
- Google provider with the §3.3 token and session shape. The hash is computed from `account.providerAccountId` / `profile.sub`.
- `isAdmin` comes from `ADMIN_EMAILS`: case-insensitive, trimmed, and checked only inside the `jwt` callback. Never persist or log the email.
- The consent cookie (signed with `NEXTAUTH_SECRET`), the §4 actions and the session helpers.
- Unit tests for: the hash (deterministic, secret-dependent), admin email parsing, and no email/name/image in session output.

### Agent 3: Flow & API
**Owns:** `src/lib/flow/**`, `src/lib/rate-limit.ts`, `src/lib/http.ts` (origin check and error helpers), `src/app/study/page.tsx` (redirect-only router), `src/app/api/{demographics,comprehension,responses}/route.ts`, `tests/unit/flow/**`.
**Deliver:**
- Everything in §3.5–3.9.
- Every route re-checks, in this order: session → participant exists → not completed (409) → correct step (403) → rate limit → zod → write.
- Demographics can be saved only once; the comprehension check can be submitted only once (both 409 afterwards).
- Responses require the primer to be done and `scenarioId` to equal the current expected scenario.
- Unit tests for `getNextStep`, covering every branch using plain objects.

### Agent 4: Participant UI
**Owns:** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (landing and consent), `src/app/(study)/{demographics,primer,scenario,debrief,completed}/page.tsx`, `src/components/**`.
**Deliver:**
- **Every page is a server component.** It calls `getCurrentParticipant()`; if the returned step's path isn't this page, it `redirect()`s there. The exception is `/debrief`, which is shown to participants whose step is `completed`, right after their last answer.
  - `/completed` shows "You've already completed this study, thank you" and is where returning completed participants land. After the final submit, the API returns `next: "/debrief"`.
- **Forms** are client components that POST JSON and then `router.replace(next)`. There is no back navigation to answered scenarios.
- **The scenario page** renders the two questions in `questionOrder` and shows progress ("Scenario 3 of 12"). The optional questions appear only when the flags are on.
- **Landing page:** consent text from config, a required checkbox, and a form bound to `consentAndSignIn`.
- **Accessibility:** `fieldset`/`legend` radio groups, labels, visible focus, error summaries that receive focus, 44px tap targets, WCAG AA contrast, and a neutral design that works at 360px width.
- Never import server-only modules into client components.

### Agent 5: Admin & seed
**Owns:** `src/app/admin/**` (including `src/app/admin/export/{responses,participants}.csv/route.ts`), `src/lib/admin/**`, `prisma/seed.ts`, `tests/unit/admin/**`.
**Deliver:**
- `requireAdmin()` at the top of every admin page and route.
- **Dashboard:** started, completed, in progress, comprehension failures, duplicate groups (with member IDs), and straight-liners.
- **CSV exports** matching the spec's columns, using the internal `id` and never the hash:
  - Time on scenario in seconds (§3.6).
  - Total time = `completed_at − started_at`.
  - Correctness per choice, via Agent 1's functions.
- Correct CSV escaping, plus formula-injection guarding: prefix cells that start with `= + - @` with `'`.
- **Seed script:** about 20 participants with fake hashes (`participantHash("seed-sub-N")`), including one duplicate pair, one straight-liner, two in-progress participants and one comprehension failure. It is idempotent: it deletes rows whose hash is in the seed set first.
- Unit tests for CSV escaping.

### Agent 6: Integration
**Owns:** merging, `tests/integration/**`, `README.md`, and any file needed to resolve conflicts. It also applies the "Requested changes" from every handoff file.
**Deliver:**
- Merge branches in the order 1 → 2 → 3 → 5 → 4 and confirm no stubs remain (`grep NOT_IMPLEMENTED`).
- **Integration tests** against the test database (mock `@/lib/auth/session`, call route handlers directly):
  - (a) The same Google `sub` completes the study, then a second attempt at any write returns 409 and no new rows appear.
  - (b) A participant answers 1 of N, then "returns": the next step is scenario 2 in the stored order, the order is unchanged, and overwriting scenario 1 returns 409.
  - Also: an out-of-order `scenarioId` returns 403, and a request with a bad Origin is rejected.
- **README:** local setup, Google Cloud OAuth console steps (consent screen, redirect URI `/api/auth/callback/google`), migrations, seed, tests, deploy, and the rate-limit caveat.
- **Final checks:** lint, typecheck, unit and integration tests, and build all green; `grep -r answerKey .next/static` finds nothing; no `email` field in the Prisma schema or logs.
- Write `HANDOFF/6-integration.md` with anything left open.
You are agent 0. This is the repo you will be working in. Codebook_UI