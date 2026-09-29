# Agent 6: Integration handoff

## Done
- **Merges** into `main` with `--no-ff`, in the order 1 → 2 → 3 → 5 → 4. All were clean, with no conflicts. Typecheck and unit tests passed after each one:

  | Merge | Commit | Unit tests after |
  |---|---|---|
  | agent/1-quality | fc39d30 | 51 |
  | agent/2-auth | 035ec29 | 78 |
  | agent/3-flow | 2b2f1af | 154 |
  | agent/5-admin | 65b3418 | 180 |
  | agent/4-ui | fc378bc | 180 |

  `grep -rn NOT_IMPLEMENTED src` finds nothing.
- **Requested changes** (23d0c4c):
  1. `prisma.config.ts`: the seed command is `tsx --conditions=react-server prisma/seed.ts` (Agent 5). `npm run db:seed` ran twice against the dev DB, and both runs printed "removed 20 previous seed participant(s), created 20".
  2. `src/lib/scenarios.ts`: optional `imageAlt` (trimmed, non-empty) is added to `ScenarioSchema`, `PublicScenario` and `toPublicScenario` (Agent 4). `toPublicScenario` is now an explicit allow-list. `serveCurrentScenario` already spreads `toPublicScenario(...)`, so Agent 3's code needed no change. The scenario page uses `s.imageAlt ?? s.title` without a cast. Two unit tests were added in `tests/unit/scenarios.test.ts`.
  3. `.env.example` now suggests `openssl rand -hex 32`, the same as the `env.ts` error message (Agent 2).
- **Integration tests** (25876b1): `tests/integration/`, 3 files with 14 tests. They call the real route handlers against `codebook_test`, with only `@/lib/auth/session` and `@/lib/auth/consent-cookie` mocked.
  - `one-response.test.ts` (a):
    - A Google `sub` completes the whole study through the real routes.
    - Signing in again resolves to the same row with step `completed`.
    - Demographics, comprehension and every responses write then return 409 `study_completed`. Row counts and the response rows are unchanged.
    - A direct second insert with the same hash fails with P2002.
    - A different `sub` gets its own participant.
  - `resume.test.ts` (b):
    - The participant answers 1 of N, signs out and signs back in.
    - The step is scenario `order[1]` at position 1, and `scenarioOrder` is unchanged.
    - Re-serving keeps `questionOrder` and `firstServedAt`.
    - Overwriting scenario 1 returns 409 `already_answered`, and the row is unchanged.
    - A participant who stopped before demographics also resumes correctly.
  - `guards.test.ts`:
    - An out-of-order or unknown `scenarioId` returns 403 `wrong_step`, and so does an answer to a scenario that was never served.
    - Answers before demographics or before the primer return 403.
    - A foreign, missing or `null` Origin returns 403 `bad_origin` on all 3 routes.
    - A non-JSON content type returns 415.
    - No session returns 401, and no participant row returns 403.
    - A second demographics submission returns 409.
    - None of these writes anything.
- **README.md** (ed01d9f): overview, local setup, env table, Google OAuth console steps, scenario schema (including `imageAlt`), migrations and seed, tests, admin and exports, deploy (generic, with Vercel as an example), rate-limit caveat, privacy notes and project layout.
- **Final checks** (all passed on the final tree):
  - `npm run lint`: 0 problems.
  - `npm run typecheck`: passes.
  - `npm test`: 19 files, 182 tests passed.
  - `npm run test:integration`: 3 files, 14 tests passed.
  - `npm run build`: succeeds. All 15 routes are `ƒ` (dynamic).
  - `grep -rE "answerKey|COMPREHENSION_CORRECT|comprehension-answers" .next/static` finds nothing. The correct-answer tuple isn't in the client bundle; only the public option values are.
  - The Prisma schema and migrations have no `email` column; the only match is a comment saying never to add one.
  - Log calls in `src`: the Auth.js logger prints only the error type and warning code, and the startup log prints only the scenario count. Prisma logs only `warn` and `error`.
  - Production smoke test (`next start`):
    - `/` returns 200 and contains the consent checkbox.
    - `/study` and `/scenario` redirect to `/`.
    - `/admin` and the CSV routes return 404.
    - `/api/auth/providers` and `/api/auth/session` return 200.
    - A POST with a bad Origin returns `bad_origin`, and a POST without a session returns `unauthorized`.

## Not done / open
- **Real Google sign-in round trip:** not tested, because `.env` has placeholder Google credentials. See the manual steps below.
- **Not pushed:** the GitHub remote rejects pushes with 403 (a credentials issue). Everything is committed locally on `main`. Worktrees and `agent/*` branches are kept.
- **Placeholder content:** the study copy in `src/config/study.ts` and the 2 scenarios in `data/scenarios.json` are still placeholders for the researcher to replace.
- **Rate limiting:** in-memory only, so a multi-instance deployment needs a shared store (documented in the README).
- **Expected log line:** the integration run prints one `prisma:error … Unique constraint failed` line. It comes from the P2002 test, which is meant to fail that insert; the test itself passes.

## Decisions made
1. **Mock setup:** the mocked auth state lives in `tests/integration/auth-mock.ts`, which has no imports. A `vi.mock` factory that imported `helpers.ts` deadlocked, because helpers imports the routes and the routes import the mocked modules.
2. **Test database cleanup:** integration tests `TRUNCATE responses, participants` before each test. `resetDb()` first asserts that `DATABASE_URL === TEST_DATABASE_URL`, and the existing global setup already refuses to run if the two URLs are equal.
3. **Participant creation in tests:** participants are created through the real `ensureParticipant()` (the consent cookie mocked as valid), and their hashes come from the real `participantHash()`.
4. **No hard-coded scenario count:** the tests read N from the stored order, so they keep working when the real scenarios replace the placeholders. The resume and out-of-order tests need at least 2 scenarios.
5. **Deploy docs:** generic steps for a Node host with managed Postgres, with Vercel only as an example (approved by the user).

## Requested changes
None.

## How to verify
```bash
export PATH=/home/zarni/.nvm/versions/node/v22.23.3/bin:$PATH
npm run db:up
npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build
grep -rE "answerKey|COMPREHENSION_CORRECT" .next/static    # expect no output
```

### Manual Google sign-in test (needs real OAuth credentials)
1. Create a Web OAuth client (README, "Google OAuth setup"):
   - JavaScript origin: `http://localhost:3000`.
   - Redirect URI: `http://localhost:3000/api/auth/callback/google`.
   - Add your account as a test user.
2. Put the client ID and secret in `.env`, and add your email to `ADMIN_EMAILS`. Then run `npm run db:migrate && npm run db:seed && npm run dev`.
3. At http://localhost:3000, submit without ticking consent. The error summary should appear and take focus.
4. Tick consent and sign in with Google. You should land on `/demographics`. `/api/auth/session` should show only `expires`, `participantHash` and `isAdmin`, with no email, name or image.
5. Complete demographics and the primer. The scenarios should show "Scenario 1 of 2".
6. Answer 1 scenario, sign out, and sign in again. You should land on scenario 2.
7. Finish the study. You should reach `/debrief`. Sign out and sign in again, and you should land on `/completed`.
8. As an admin, open `/admin`. It should show the seed numbers plus your participant: started 21, completed 19. Download both CSVs and check that neither contains a hash or an email.
9. With a Google account that isn't in `ADMIN_EMAILS`, `/admin` should return 404.
10. Check the `participants` table: there's no email column, and the dev server log contains no email.
