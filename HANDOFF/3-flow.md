# Agent 3: Flow & API handoff

## Done
- `src/lib/flow/next-step.ts` (pure): `getNextStep` resolves consent → demographics → primer → scenario (next unanswered position in the stored order, 0-based) → completed. `stepToPath` maps steps to paths.
- `src/lib/flow/shuffle.ts` (pure): a Fisher–Yates `shuffle` using `crypto.randomInt`, and `randomQuestionOrder`.
- `src/lib/flow/participant.ts`:
  - `getCurrentParticipant`.
  - `ensureParticipant` (§3.5). It creates the row only if `readConsentIntent()` is true, sets `consentedAt = startedAt = now`, and shuffles the order once. On a concurrent create (P2002) it re-reads the existing row.
  - Helpers: `loadParticipantState(hash)` (participant + answeredCount + step), `countAnswered` and `isUniqueViolation`.
- `src/lib/flow/scenario.ts` `serveCurrentScenario` (§3.6):
  - First render creates the row with a random `questionOrder` and `firstServedAt = servedAt = now`.
  - Later renders only update `servedAt`, guarded by `answeredAt IS NULL`.
  - A race on create falls back to the existing row.
  - It throws if the participant isn't on a scenario step, or if the stored order references a scenario missing from `data/scenarios.json`.
  - It returns `PublicScenario` fields only (no `answerKey`).
- `src/lib/rate-limit.ts`: an in-memory sliding window allowing 10 hits per 60s per key. Old entries are swept once the map holds more than 10k keys. `resetRateLimit()` exists for tests.
- `src/lib/http.ts`:
  - The Origin check, which must exactly match `new URL(NEXTAUTH_URL).origin`; a missing Origin or `null` is rejected.
  - The JSON content-type check.
  - `ok(next)` / `fail(status, error, {next, fields, headers})` helpers, with `Cache-Control: no-store`.
  - `readJson` and `issueFields`.
- `src/lib/flow/guard.ts` `guardWrite(req, stepCheck)` runs the shared chain in this order:
  1. Origin (403)
  2. Content-Type (415)
  3. Session (401)
  4. Participant exists (403 `no_participant`)
  5. Not completed (409 `study_completed`)
  6. Route step check (403/409)
  7. Rate limit (429 + `Retry-After`)
  8. JSON body (422 `invalid_json`)

  The route then validates with zod (422 `validation` + `fields`) and writes.
- `POST /api/demographics`: can be saved once, via a conditional `updateMany WHERE demographicsAt IS NULL`. Returns `next: "/primer"`.
- `POST /api/comprehension`:
  - Requires the primer step; already submitted → 409.
  - Each answer must be an option `value` from `study.comprehension[i].options` (else 422).
  - Sets `comprehensionAnswers`, `comprehensionPassed` (both correct) and `primerCompletedAt` in one conditional update. Returns `next: "/scenario"`.
- `POST /api/responses` (§3.7):
  - `scenarioId` must equal the current one. An earlier, already-answered scenario → 409 `already_answered`; any other mismatch → 403.
  - `own`/`confidence` are required iff their flag is on, and rejected (422) when it's off.
  - One transaction runs `updateMany WHERE participantId, scenarioId, position, answeredAt IS NULL`. It then sets `completedAt` (guarded by `completedAt IS NULL`) once the answered count equals the order length.
  - If 0 rows are updated: already answered → 409; never served → 403 `next: "/scenario"`.
  - Returns `/scenario`, or `/debrief` after the last answer.
- `src/app/study/page.tsx`: redirect-only. `await connection()`, then `ensureParticipant()`, then `redirect(stepToPath(step))`, or `/` if it returns null.
- Tests in `tests/unit/flow/**` (76 tests):
  - Every `getNextStep` branch and `stepToPath`.
  - Shuffle, the rate limiter (fake timers) and the http helpers.
  - All three routes with mocked `db`/session: guard order, 401/403/409/415/422/429 and success paths.
  - `ensureParticipant` and `serveCurrentScenario`.

## Not done
- Integration tests against a real DB (Agent 6). I didn't run `db:migrate` or `test:integration`, because the dev DB is shared.
- Everything depends on Agent 2's `getParticipantHash` and `readConsentIntent`. Until those merge, the routes and `/study` throw NOT_IMPLEMENTED at runtime; unit tests mock them.

## Decisions made
1. **Error codes and statuses** (approved):
   - `bad_origin` 403, `unsupported_media_type` 415, `unauthorized` 401, `no_participant` 403, `wrong_step` 403.
   - `study_completed` 409, `already_submitted` 409 (demographics/comprehension), `already_answered` 409 (responses).
   - `rate_limited` 429, `invalid_json` 422, `validation` 422 (with `fields`: paths only, never values).
2. **`next` in error bodies:**
   - 401/`no_participant` → `/`
   - `study_completed` → `/completed`
   - `wrong_step` → the current step's path
   - `already_submitted`/`already_answered` → `/study` or `/scenario`, which re-resolve the step.
3. **Origin/Content-Type run before the session check,** so CSRF checks come first. After that the §5 order holds: session → participant → completed → step → rate limit → zod → write.
4. **Rate-limit counting:** requests that reach the limiter count, including ones later rejected with 422. Requests rejected earlier (e.g. wrong step) don't count.
5. **Missing Origin header:** rejected. Browsers send Origin on same-origin `fetch` POSTs, so this is safe for our own UI.
6. **Missing scenario in a stored order** (approved): `serveCurrentScenario` throws with a message naming the ID and position. Nothing is skipped or reshuffled.
7. **Answer never served:** a POST for the current scenario before `/scenario` rendered it (no row) gets 403 `wrong_step` with `next: "/scenario"`. Rendering the page creates the row and the timing.
8. **Consent cookie:** not cleared after the participant row is created (pages can't set cookies). It expires after 30 minutes, and the row governs from then on.
9. **Completion check:** `completedAt` is set when the answered count, counted inside the transaction, reaches `scenarioOrder.length`, rather than trusting `position` alone.
10. **Contract signatures are unchanged.** Extra exports: `loadParticipantState`, `countAnswered`, `isUniqueViolation`, `ParticipantState`, `resetRateLimit`, `RATE_LIMIT`, `RATE_WINDOW_MS`. New files: `src/lib/flow/guard.ts` and `src/lib/flow/shuffle.ts`.

## Requested changes
None.

## How to verify
```bash
export PATH=~/.nvm/versions/node/v22.23.3/bin:$PATH
npm run typecheck && npm test && npm run lint && npm run build
npx vitest run --project unit tests/unit/flow   # Agent 3's tests only
```
Suggested integration coverage for Agent 6: mock `@/lib/auth/session` and call the route `POST` handlers directly. Send `origin: NEXTAUTH_URL` and `content-type: application/json`. Call `resetRateLimit()` between tests. Call `serveCurrentScenario(id)` before posting each response, since a row must exist.
