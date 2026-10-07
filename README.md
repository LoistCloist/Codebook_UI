# Codebook UI: self-driving car dilemmas study

A research web app. Participants read self-driving-car dilemma scenarios and say which action the
car should take under **utilitarian** ethics and under **Kantian** ethics. Data integrity,
anonymity and one response per person come first.

Stack: Next.js 16 (App Router) · TypeScript · PostgreSQL 16 via Prisma 7 · Auth.js v5 (Google) ·
Tailwind 4 · zod · Vitest.

## Contents

1. [How it works](#how-it-works)
2. [Local setup](#local-setup)
3. [Google OAuth setup](#google-oauth-setup)
4. [Scenarios and study text](#scenarios-and-study-text)
5. [Database: migrations and seed](#database-migrations-and-seed)
6. [Tests and checks](#tests-and-checks)
7. [Admin area and exports](#admin-area-and-exports)
8. [Deploy](#deploy)
9. [Privacy and security notes](#privacy-and-security-notes)
10. [Project layout](#project-layout)

## How it works

Participant flow: **consent** (`/`) → Google sign-in → `/study` (creates the participant row and
routes to the right step) → **primer + 2-question comprehension check** →
**scenarios**, one per page, in an order shuffled once per participant and stored → **debrief**.

- **One response per person.** A participant is identified by
  `HMAC-SHA256(PARTICIPANT_HASH_SECRET, google_sub)`. `participants.participant_hash` is unique in
  the database, and every write route re-checks the participant and their current step on the server.
  A participant who has completed the study and signs in again sees "You've already completed this
  study" (`/completed`), and every write returns 409.
- **Resume.** Each answer is saved as soon as it is submitted. A returning participant is sent to
  the first incomplete step. Answers are final: overwrites return 409.
- **Timing.** Server timestamps: `first_served_at`/`served_at` when the scenario page renders,
  `answered_at` when the answer is saved. Time on scenario = `answered_at − served_at`.
- **Question order.** Which of the two questions comes first is randomized per scenario and stored
  (`U_first` / `K_first`).
- A failed comprehension check doesn't block the participant; it sets `comprehension_passed = false`.

## Local setup

Prerequisites: **Node 22** (`nvm use` reads `.nvmrc`), npm, and Docker (for Postgres).

```bash
nvm use                         # Node 22
npm ci                          # also runs `prisma generate`
cp .env.example .env            # then fill it in (below)
npm run db:up                   # Postgres 16 on localhost:5433, creates `codebook` + `codebook_test`
npm run db:migrate              # applies prisma/migrations to the dev DB
npm run db:seed                 # optional: 20 fake participants for the admin dashboard
npm run dev                     # http://localhost:3000
```

`.env` variables (all validated at startup by `src/lib/env.ts`; the server refuses to start if any
is missing or malformed):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Dev database. The default in `.env.example` matches `docker-compose.yml`. |
| `TEST_DATABASE_URL` | Used only by `npm run test:integration`. Must differ from `DATABASE_URL`: those tests wipe it. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | From the Google Cloud console (next section). |
| `NEXTAUTH_SECRET` | At least 32 characters: `openssl rand -hex 32`. Signs the session and the consent cookie. |
| `NEXTAUTH_URL` | The site's origin, e.g. `http://localhost:3000`. Write routes reject requests whose `Origin` differs. |
| `PARTICIPANT_HASH_SECRET` | At least 32 characters: `openssl rand -hex 32`. **Never change it after data collection starts**, or returning participants get new hashes and could respond twice. Back it up. |
| `ADMIN_EMAILS` | Comma-separated Google account emails allowed into `/admin` (case-insensitive). |
| `DIRECT_URL` | Production only: direct/session connection for `prisma migrate` (falls back to `DATABASE_URL`). |
| `DATABASE_POOL_MAX` | Optional: connections per server instance (default 3 in production, 10 otherwise). |
| `DATABASE_SSL_CA` | Optional: the database's root CA (PEM). Enables verified TLS; don't also put `sslmode` in `DATABASE_URL`. |

## Google OAuth setup

In the [Google Cloud console](https://console.cloud.google.com/):

1. Create (or pick) a project.
2. **APIs & Services → OAuth consent screen** (Google Auth Platform → Branding / Audience):
   - User type **External**. Fill in the app name, a support email and a developer contact.
   - Scopes: only the defaults `openid`, `email`, `profile`. The app reads the email only to check
     `ADMIN_EMAILS` and never stores it.
   - While the app is in **Testing**, only the listed test users can sign in. Add yourself (and any
     pilot participants). **Publish** the app before real data collection so anyone can sign in.
     Basic-scope apps usually don't need Google's verification review.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins:** `http://localhost:3000` (and your production origin, e.g.
     `https://study.example.org`).
   - **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google` and
     `https://study.example.org/api/auth/callback/google`. The path must be exactly
     `/api/auth/callback/google`.
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

Admin access additionally requires Google to report the email as verified.

## Scenarios and study text

Scenarios live in `data/scenarios.json`. The file is validated with zod when the server starts; if
it's malformed, startup fails with every problem listed. It holds the 50 assessment scenarios
(`CATA_S003` … `CATA_S197`, zero-padded from the codebook's `CATA_S3` … `CATA_S197`) with their
answer keys. Edit it directly. `public/rulebook.pdf` is the Utilitarian/Kantian rulebook, linked from
the primer and every scenario.

```json
{
  "id": "s01",
  "title": "string",
  "text": "string (the scenario as written)",
  "image": "/scenarios/s01.png",
  "imageAlt": "Short description of the image, for screen readers",
  "world": ["1 cyclist is directly ahead…", "…"],
  "actions": { "maintain": "kills 1 cyclist ahead", "swerve_left": "…", "swerve_right": "…" },
  "features": ["Swerve left/right = active redirection", "…"],
  "answerKey": {
    "utilitarian": ["maintain"],
    "kantian": ["swerve_left", "swerve_right"]
  }
}
```

- `id`: letters, digits, `_` and `-`. Zero-pad numbers (`s01`, `s02`, …, `s10`): answer strings sort
  by ID as plain text, so `s10` would sort before `s2`.
- `image` (optional): a file under `public/scenarios/`, referenced as `/scenarios/<file>`. The file must exist.
- `imageAlt` (optional): alt text for the image. Without it, the scenario title is used.
- `world`, `actions`, `features` (optional): shown under the text as "World state", "Actions and
  outcomes" (one line per action, labelled like the answer buttons) and "Structurally relevant moral
  features". `actions` needs all three choices.
- `answerKey`: arrays, because more than one action can be correct. Values: `maintain`,
  `swerve_left`, `swerve_right`. The answer key is server-only and never sent to the browser. It's
  optional so a scenario can be shown before it's graded, but a scenario without one is left out of
  agreement scores (its correct/incorrect cells export blank) and startup logs a warning listing it.
- **Don't remove or rename a scenario after data collection starts.** Each participant's order is
  stored once and never reshuffled; a missing ID stops that participant with an error.

Study text (consent, primer, debrief, researcher contact, comprehension questions) lives in
`src/config/study.ts`; replace everything marked `[PLACEHOLDER]`. The flags `askOwnChoice` ("What
should the car actually do?") and `askConfidence` (1–5) default to `false`. The correct
comprehension answers are in `src/config/comprehension-answers.ts` (server-only), in the same order
as the questions, as option `value`s.

## Database: migrations and seed

| Command | What it does |
|---|---|
| `npm run db:up` | Starts Postgres 16 (docker compose, host port 5433). |
| `npm run db:migrate` | `prisma migrate dev`: applies migrations in development and creates new ones after schema edits. |
| `npm run db:deploy` | `prisma migrate deploy`: applies pending migrations only. Use this in production. |
| `npm run db:seed` | Creates 20 fake participants (see below). Refuses to run with `NODE_ENV=production`. |

The seed (`prisma/seed.ts`) creates participants hashed from `seed-sub-1` … `seed-sub-20`:
a duplicate pair (#1, #2), a straight-liner (#3), a comprehension failure (#4), two in progress (#5,
#6) and 14 other completed participants. It is idempotent: it deletes the previous seed rows first
and never touches real participants. Expected dashboard: started 20, completed 18, in progress 2,
comprehension failures 1, 1 duplicate group (2 members), 1 straight-liner.

## Tests and checks

```bash
npm run lint
npm run typecheck
npm test                     # unit tests (tests/unit)
npm run test:integration     # integration tests against TEST_DATABASE_URL (Postgres must be up)
npm run build
```

- **Unit tests** cover answer strings, duplicate and straight-line detection, answer-key scoring,
  the participant hash, admin-email parsing, the session shape (no email/name/picture), the consent
  cookie, the step resolver, the route guards, CSV escaping and the scenario loader.
- **Integration tests** (`tests/integration`) call the real route handlers against the test
  database, with only the auth session mocked. They check that:
  - the same Google account can complete the study once; afterwards every write returns 409 and no
    rows are added, and the database refuses a second row for the same hash;
  - an interrupted participant resumes at the next scenario in their unchanged stored order, and
    overwriting an answered scenario returns 409;
  - out-of-order answers, answers before the primer, bad or missing `Origin`, non-JSON bodies and
    missing sessions are all rejected without writing.

  The test run applies migrations to `TEST_DATABASE_URL` first and **empties that database** between
  tests. It refuses to run if it equals `DATABASE_URL`.

After a build, `grep -r answerKey .next/static` should print nothing.

## Admin area and exports

`/admin` is available only to signed-in Google accounts listed in `ADMIN_EMAILS`; everyone else
gets a 404. It shows started / completed / in-progress counts, comprehension-check failures,
duplicate groups (with participant IDs) and straight-liners, plus two CSV downloads:

- `/admin/export/responses.csv`: one row per response (including served-but-unanswered rows), with
  the internal participant ID, scenario, choices, question order, 0-based position, time on scenario
  (seconds) and whether each choice matches the answer key.
- `/admin/export/participants.csv`: one row per participant, with demographics, comprehension
  result, status, total time, `duplicate_group`, straight-line flag and % agreement with the answer
  key per theory.

Quality flags (duplicate answer strings, straight-lining) are computed for completed participants
only and never block anyone. Exports use the internal `id`, never the hash, and guard against CSV
formula injection.

## Deploy

**Recommended: Vercel + Supabase.** Follow the step-by-step checklist in
[`docs/deploy-vercel.md`](docs/deploy-vercel.md). It covers the database, Vercel
settings, Google OAuth for production, a smoke test and a launch checklist.

Any other Node 22 host with managed PostgreSQL works too:

1. Create the production database. Set `DATABASE_URL` (pooled, if the provider has a pooler) and,
   for migrations, `DIRECT_URL`. For verified TLS, set `DATABASE_SSL_CA` to the provider's root CA
   and leave `sslmode` out of `DATABASE_URL`.
2. Set every variable from the table above. Use **new** secrets for production,
   `NEXTAUTH_URL=https://your-domain`, and keep `PARTICIPANT_HASH_SECRET` fixed (and backed up)
   for the whole study. `TEST_DATABASE_URL` isn't needed in production.
3. Add the production origin and `https://your-domain/api/auth/callback/google` to the Google
   OAuth client, and publish the consent screen.
4. Build and start:
   ```bash
   npm ci
   npx prisma migrate deploy     # or: npm run db:deploy
   npm run build
   npm start                     # listens on $PORT (default 3000)
   ```
5. **Never run the seed in production.** It refuses when `NODE_ENV=production`.
6. On hosts that expose tables through an automatic API (Supabase's Data API, for example),
   disable it. The migrations also enable row-level security with no policies, which blocks
   those APIs while the app, as table owner, is unaffected.

## Privacy and security notes

- No email, name or profile picture is stored or logged for participants. Auth.js uses JWT
  sessions **without a database adapter**; the token holds only `participantHash` and `isAdmin`. The
  email is read only inside the sign-in callback to check `ADMIN_EMAILS`. Auth.js debug logging is
  off and its logger never prints profile data. Prisma logs only warnings and errors.
- Consent is recorded before sign-in with a signed, httpOnly `consent_intent` cookie (30 minutes).
  It isn't used for one-response enforcement; the participant hash and the database are.
- Write routes (`/api/comprehension`, `/api/responses`) require
  `Content-Type: application/json` and an `Origin` equal to `NEXTAUTH_URL` (CSRF protection), then
  check session → participant → not completed → current step → zod validation. There is no rate limit;
  one response per person per scenario is enforced by the database.
- The answer key, the comprehension answers and all DB code are `server-only`; the client receives
  scenarios without `answerKey`.

## Project layout

```
data/scenarios.json            scenarios (validated at startup)
prisma/                        schema, migrations, seed
src/config/                    study text and flags, countries, comprehension answers (server-only)
src/app/                       pages: / (consent), /study (router), (study)/*, admin/*, api/*
src/components/                participant UI (forms, radio groups, error summary, …)
src/lib/auth/                  Auth.js callbacks, participant hash, consent cookie, session helpers
src/lib/flow/                  step resolver, participant creation, scenario serving, write guard
src/lib/quality/               answer strings, duplicates, straight-lining, scoring (pure)
src/lib/admin/                 dashboard stats and CSV exports
tests/unit, tests/integration  Vitest suites
HANDOFF/                       notes from each build agent
```
