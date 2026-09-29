# Agent 1: Quality logic handoff

## Done
- `src/lib/quality/index.ts`: all five §4 functions implemented with the signatures unchanged. The module is pure: its only imports are the `Choice` type and `createHash` from `node:crypto`. No Prisma, Next, env or `server-only`.
  - `buildAnswerString(rs)`: sorts by `scenarioId` and returns `"s01:U=maintain,K=swerve_left|s02:..."`.
  - `findDuplicateGroups(ps)`: participant ID → group ID, only for answer strings shared by 2 or more distinct participants.
  - `isStraightLiner(rs)`: implements §3.12.
  - `scoreResponse(r, key)`: supports keys with more than one correct answer.
  - `agreement(rs, keys)`: per-theory %, on a 0–100 scale with 2 decimals.
- One extra export, which is additive and isn't a §4 contract: `duplicateGroupId(answerString)`, which returns the first 8 hex characters of `sha256(answerString)`.
- `tests/unit/quality/{answer-string,duplicates,straight-lining,scoring}.test.ts`: 31 tests.

## Not done
- Nothing in scope.

## Decisions made
1. **Sort order:** scenario IDs are compared by plain code units, not `localeCompare`, so the result is the same in every locale. This means `"s10"` sorts before `"s2"` (zero-padded IDs such as `s01` avoid that) and uppercase sorts before lowercase. The input array is never modified.
2. **`buildAnswerString`:** empty input gives `""`. A repeated `scenarioId` throws; the DB unique constraint makes this impossible in practice.
3. **`findDuplicateGroups`:**
   - Matching is exact, with no trimming or case folding.
   - Empty answer strings are never grouped.
   - The same `participantId` listed twice isn't treated as a duplicate of itself.
   - Participants without a group are absent from the Map, so callers should use `map.get(id) ?? null`.
   - The group ID depends only on the string, so it stays the same across runs and input orders.
   - Two different strings could collide in the 8-hex (32-bit) prefix, but this is negligible at study scale and not handled.
4. **`isStraightLiner`:** a single response whose U and K choices are equal counts as straight-lining (the rule applies literally). Empty input gives false.
5. **`agreement`** (approved by the user):
   - It returns `NaN` for a theory when no response can be scored. Agent 5 exports that as a blank cell.
   - Responses whose `scenarioId` isn't in `keys` are left out of both the correct count and the answered count. Keys are looked up with `Object.hasOwn`, so inherited names such as `toString` never match.
   - Values are on a 0–100 scale, rounded half up to 2 decimals via `Math.round(correct * 10000 / answered) / 100`, which avoids float drift (e.g. 1/800 gives 0.13).
6. **Caller contract:** pass only answered responses, meaning both choices are non-null (`QResponse` has no nulls). For duplicate detection, pass only completed participants (§3.13).

## Requested changes
None.

## How to verify
```bash
export PATH=/home/zarni/.nvm/versions/node/v22.23.3/bin:$PATH   # Node 22
npm run typecheck && npm test && npm run lint
npx vitest run tests/unit/quality    # 31 tests
```
