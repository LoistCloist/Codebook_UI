# Agent 0: Foundation handoff

## Done
- Next.js 16.3.6 scaffold (App Router, `src/`, `@/*`, Tailwind 4, ESLint 9), npm, `engines.node >=22.12`, `.nvmrc` = 22.
- Dependencies: next-auth 5.0.0-beta.32, Prisma 7.10.0 + `@prisma/adapter-pg`, zod 4, Vitest 5, `server-only`, tsx, dotenv.
- npm scripts: `dev · build · start · lint · typecheck · test · test:integration · db:up · db:migrate · db:deploy · db:generate · db:seed`, plus `postinstall: prisma generate`.
- `docker-compose.yml`: Postgres 16 on **host port 5433**, which creates `codebook` (dev) and `codebook_test` (via `docker/postgres-init/`).
- `.env.example` with all spec vars plus `TEST_DATABASE_URL`. `src/lib/env.ts` validates with zod (`getEnv()`, `env` proxy, `parseEnv()`); values are never printed in errors.
- `prisma/schema.prisma` per §4 and the `init` migration, plus hand-written CHECK constraints: `position >= 0`, `confidence` 1–5, and answered rows must have both choices.
- `src/lib/db.ts`: Prisma singleton (`db`) that also re-exports everything from the generated client (types such as `Participant`, `Prisma`).
- `data/scenarios.json` (2 placeholders). `src/lib/scenarios.ts` (server-only, zod strict, cached, checks that referenced image files exist). `src/instrumentation.ts` validates env and scenarios at server start.
- `src/lib/schemas.ts`: the §4 schemas plus `AgeRange`, `YesNoPnts`, `EthicsCoursework`, `QuestionOrder` and `Country`, with a compile-time check that they match the Prisma enums.
- `src/config/study.ts` (copy, flags, comprehension questions, option label lists), `src/config/comprehension-answers.ts` (server-only) and `src/config/countries.ts` (249 ISO codes).
- Contract stubs for every §4 file owned by Agents 1, 2, 3 and 5 (`grep -rn NOT_IMPLEMENTED src`).
- Placeholder `src/app/layout.tsx`, `page.tsx` and `globals.css` (Agent 4 replaces them).
- Unit tests: `tests/unit/{scenarios,env,schemas}.test.ts` (20 tests), including "malformed file throws".

## Not done
- `prisma/seed.ts` (Agent 5). `npm run db:seed` fails until it exists.
- `src/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts` aren't §4 contracts, so Agent 2 creates them.
- README (Agent 6).

## Decisions made
1. **Node 22** (the user chose this). Vitest 5 requires Node 22+, and npm 12 doesn't support Node 20.
2. **Prisma 7.10.0** (latest stable). npm's `latest` tag points at 8.0.0-rc.17, so it was skipped. Prisma 7 specifics:
   - Uses `prisma.config.ts` (loads `.env` via dotenv) and the `prisma-client` generator.
   - The client is generated to `src/generated/prisma` (gitignored; created by `postinstall`).
   - Import it from `@/lib/db`, or type-only from `@/generated/prisma/client`.
   - `migrate dev` no longer runs seed or generate automatically.
3. **Postgres host port 5433**, because a local Postgres already uses 5432.
4. **Age range values:** Prisma identifiers can't start with a digit, so the TS/zod values are `age_18_24 … age_65_plus, prefer_not_to_say`. Postgres stores the spec's values (`18_24`, …) via `@map`. Agent 5's CSV export should strip the `age_` prefix if it wants the spec's values.
5. **`responses.position` is 0-based** (an index into `scenarioOrder`). The UI shows `position + 1`.
6. **Comprehension answers** are submitted as option `value`s from `study.comprehension[i].options`, and compared with `COMPREHENSION_CORRECT` in the same order.
7. **Country** is `z.enum(COUNTRY_VALUES)`: 249 ISO alpha-2 codes plus `prefer_not_to_say`.
8. **Startup validation:** `env` is validated lazily, so importing `@/lib/env` never throws. Importing `@/lib/db` does validate, because `createClient` reads `DATABASE_URL`. `instrumentation.ts` forces full validation at server start.
9. **Scenario file reads:** `scenarios.json` is read with `fs` at runtime and is never bundled. `next.config.ts` adds `outputFileTracingIncludes` so deployments ship it.
10. **Vitest config:** named `vitest.config.mts` rather than `.ts`, to avoid Vite's ESM/CJS config warning. It has two projects:
    - `unit`: `tests/unit/**`.
    - `integration`: `tests/integration/**`. It runs `prisma migrate deploy` against `TEST_DATABASE_URL` first, sets `DATABASE_URL` to it, and runs files serially.
    - `server-only` is aliased to an empty stub in tests.
11. **`participants.consented_at` / `started_at` have no DB default**, so Agent 3 must set them explicitly (§3.5).
12. **`responses` → `participants` has `ON DELETE CASCADE`**, so the seed can delete participants by hash.
13. **`DashboardStats`** in `src/lib/admin/stats.ts` is a suggested shape. Agent 5 may change it, since it isn't a §4 signature.

## Requested changes
None.

## How to verify
```bash
nvm use                      # Node 22
npm ci                       # also runs prisma generate
cp .env.example .env         # fill secrets: openssl rand -hex 32
npm run db:up                # Postgres 16 on :5433 (dev + test DBs)
npm run db:migrate
npm run typecheck && npm test && npm run lint && npm run build
npm run test:integration     # passes with no tests; migrates codebook_test
```

## Notes for other agents
- Read `AGENTS.md`: Next 16 differs from older versions. The docs are in `node_modules/next/dist/docs/`.
- `npm audit` reports 2 high-severity advisories (`mysql2`, `deepmerge-ts`). Both come in transitively through the `prisma` CLI, a dev dependency, and aren't in the app runtime.
- A malformed `scenarios.json` makes `next start` print "Failed to prepare server … data/scenarios.json is malformed" (with every problem listed) instead of starting normally.
