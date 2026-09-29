# Agent 5: Admin & seed handoff

## Done
- `src/lib/admin/csv.ts` (pure): `csvCell` / `toCsv` / `csvResponse`.
  - Escaping is RFC 4180: cells containing `, " CR LF` are quoted and `"` is doubled. Lines end in CRLF.
  - `null`, `undefined` and non-finite numbers (NaN) become empty cells.
  - Formula-injection guard: cells starting with `= + - @` (and, per OWASP, `\t` / `\r`) get a leading `'`.
  - `csvResponse` sets `text/csv; charset=utf-8`, `Content-Disposition: attachment`, `Cache-Control: no-store` and `nosniff`.
- `src/lib/admin/compute.ts` (pure: no Prisma client, Next or env imports): `analyse`, `computeStats`, `responseRows`, `participantRows` and both CSV headers.
  - This is the one place that calls Agent 1's `buildAnswerString`, `findDuplicateGroups`, `isStraightLiner`, `scoreResponse` and `agreement`.
  - The dashboard and both exports all use it.
- `src/lib/admin/data.ts` (server-only): one Prisma query for all participants and their responses, plus the answer keys from `getScenarios()`.
- `src/lib/admin/stats.ts`: `getDashboardStats()`. The `DashboardStats` shape is unchanged; the type now lives in `compute.ts` and is re-exported.
- `src/lib/admin/export.ts`: `buildResponsesCsv()` and `buildParticipantsCsv()`. Both use the internal `id` and never the hash.
- `src/app/admin/page.tsx`: the dashboard.
  - Shows counts (started, completed, in progress, comprehension failures, duplicate groups, straight-liners), a duplicate-groups table with member IDs, the straight-liner IDs, and download links.
  - It is a server component with `noindex` metadata.
- `src/app/admin/export/{responses,participants}.csv/route.ts`: GET handlers.
- Every admin page and route runs `await connection()` and then `await requireAdmin()` before touching data. `connection()` makes sure admin data is never prerendered into static HTML at build time; the build shows all three as `ƒ` (dynamic).
- `prisma/seed.ts`: 20 participants hashed with `participantHash("seed-sub-1…20")`, all in one transaction.
  - It first deletes only rows whose hash is in that set (responses cascade).
  - It refuses to run when `NODE_ENV=production`.
  - #1 and #2 are a duplicate pair.
  - #3 is a straight-liner (all `maintain`).
  - #4 is completed but failed the comprehension check.
  - #5 is in progress, mid-scenarios, with the next scenario served but not answered.
  - #6 is in progress: demographics done, primer not yet.
  - #7–#20 are completed, each with a distinct answer string that isn't a straight-line.
  - Answer sets are generated deterministically for any number of scenarios. Scenario order is a rotation. Question order alternates. Own choice and confidence are filled only if the `study.ts` flags are on.
- Tests:
  - `tests/unit/admin/csv.test.ts`: escaping, the formula guard, CRLF, NaN/null and headers.
  - `tests/unit/admin/compute.test.ts`: stats and both row builders, with `@/lib/quality` mocked by reference implementations of the §4 contract.

## Not done
- `npm run db:seed` can't complete on this branch: `participantHash` (Agent 2) is still a stub, and the seed command still lacks the react-server condition (see Requested changes).
  - Running `npx tsx --conditions=react-server prisma/seed.ts` resolves every import (aliases, `server-only`, env, scenarios). It then stops at the `participantHash` stub, before any DB access.
  - For a full check I also ran it once with a throwaway HMAC shim for `hash.ts` and a reference shim for `@/lib/quality`. The shims were loaded via `--import` from outside the repo and nothing was committed.
  - Result: 20 seed participants created. A second run removed 20 and created 20, so it is idempotent. Stats: started 20, completed 18, in progress 2, comprehension failures 1, 1 duplicate group (2 members), 1 straight-liner. Neither CSV contains any hash.
  - Those 20 seed rows are in the shared dev DB. Their hashes are HMAC-SHA256(`PARTICIPANT_HASH_SECRET`, `seed-sub-N`), exactly what the real `participantHash` should produce, so the next real seed run replaces them.

## Decisions made
1. **Duplicate groups and straight-lining apply to completed participants only.** In-progress participants get blank `duplicate_group` and `straight_liner` cells and don't appear in the dashboard lists. (Approved by the user.)
2. **Agreement %:**
   - It is computed for every participant over their answered responses; responses whose scenario isn't in the current keys are excluded (Agent 1's `agreement`).
   - It is written with 2 decimals (`toFixed(2)`).
   - NaN, meaning nothing was scored, is exported as a blank cell.
3. **`responses.csv` has one row per response row, including served-but-unanswered ones.** Those rows have blank choice, `answered_at`, time and correctness cells. (Approved.)
4. **`position` is exported 0-based,** as stored. (Approved.)
5. **Scenario ID missing from `scenarios.json`:** the correctness cells are blank. (Approved.)
6. **Times:**
   - `time_on_scenario_sec` = `answered_at − served_at`, and `total_time_sec` = `completed_at − started_at`.
   - Both are in seconds, keeping millisecond precision (e.g. `12.5`).
   - Timestamps are ISO-8601 UTC.
7. **`age_range` is exported with the `age_` prefix stripped** (`18_24`, …, `prefer_not_to_say`), matching the spec and the DB values.
8. **Extra `participants.csv` columns:** consented_at, demographics_at, primer_completed_at, status (`completed` / `in_progress`), scenarios_answered and scenarios_total.
9. **Row order:** rows are sorted by participant id (and by position for responses), so exports are stable.
10. **No BOM in the CSV files.** pandas and R read UTF-8 without one; Excel users can import it as UTF-8.

## Requested changes
- **Agent 6, in `prisma.config.ts`:** change `migrations.seed` from `tsx prisma/seed.ts` to `tsx --conditions=react-server prisma/seed.ts`. The seed imports `@/lib/auth/hash`, `@/lib/db` and `@/lib/scenarios`, which all start with `import "server-only"`, and that throws without the `react-server` condition. (This is the user's decision.)

## How to verify
```bash
export PATH=/home/zarni/.nvm/versions/node/v22.23.3/bin:$PATH
npm run typecheck && npm test && npm run lint && npm run build
# After Agents 1 + 2 are merged and the seed command above is changed:
npm run db:seed          # twice: second run reports "removed 20 …, created 20"
npm run dev              # sign in with an ADMIN_EMAILS account, open /admin
```
On `/admin` you should see: started 20 (plus any real participants), completed 18, in progress 2, comprehension failures 1, 1 duplicate group with 2 IDs, and 1 straight-liner. Both CSV links should download, and neither file should contain `participant_hash` values. A non-admin should get a 404 on `/admin` and on both CSV URLs.
