# Deploying to Vercel + Supabase

A step-by-step checklist. It takes about an hour the first time. Dashboard labels change now and
then; if a menu item has moved, search the provider's docs for the name in **bold**.

You'll create three accounts or projects: **Supabase** (the database), **Upstash** (the shared rate
limiter) and **Vercel** (the app). Keep a private note of every value you copy; the
secrets marked 🔒 can't be recovered if lost.

---

## 0. Before you start

- [ ] Your code is on GitHub and `git push` works. Vercel deploys from GitHub. If the repo
      belongs to an organisation (`Automotive-Ethics-Labs-VIP`), an org owner may need to approve
      Vercel's GitHub app for it.
- [ ] Decide on **one region** for everything, as close to your participants as possible, and
      check it against your ethics/IRB approval for where data may be stored. For example, US
      East: Supabase `us-east-1`, Vercel `iad1` (Washington, D.C.), Upstash `us-east-1`.
- [ ] Generate production secrets (don't reuse the local ones):
      ```bash
      openssl rand -hex 32   # → NEXTAUTH_SECRET 🔒
      openssl rand -hex 32   # → PARTICIPANT_HASH_SECRET 🔒 (never change it once data collection starts; back it up)
      ```

## 1. Supabase: the database

1. [ ] <https://supabase.com> → **New project**. Pick the region from step 0 and set a strong
       **database password** 🔒.
2. [ ] Open the project's **Connect** dialog and copy two connection strings, filling in your
       password:
       - **Transaction pooler** (port **6543**). This becomes `DATABASE_URL` on Vercel.
       - **Session pooler** (port **5432** on the `pooler.supabase.com` host). This becomes
         `DIRECT_URL`, used only when you run migrations from your computer. (The "Direct
         connection" also works if your network has IPv6.)
3. [ ] **Database settings → SSL configuration**:
       - [ ] **Download certificate**. This is Supabase's root CA, a text file that starts with
             `-----BEGIN CERTIFICATE-----`. It becomes `DATABASE_SSL_CA`.
       - [ ] Turn on **Enforce SSL on incoming connections**.
4. [ ] **Lock down the Data API.** Supabase auto-generates a public REST/GraphQL API for tables in
       the `public` schema. This app never uses it. Go to **Project settings → Data API** and
       disable it, or remove `public` from the exposed schemas. (The app's migrations also turn
       on row-level security with no policies, so that API would return nothing anyway. This
       adds a second layer.)
5. [ ] **Plan and backups.** Free projects pause after about a week without activity, and have no
       point-in-time recovery. For live data collection, the **Pro** plan (daily backups) is
       the safer choice.
6. [ ] **Create the tables** by running the migrations from your computer:
       ```bash
       cd ~/Documents/CS_Projects/Codebook_UI
       DIRECT_URL='<session pooler URL>?sslmode=require' npx prisma migrate deploy
       ```
       You should see "All migrations have been successfully applied". In Supabase's **Table
       editor** you should now see `participants` and `responses`.
       - **Never run `npm run db:seed` against production.** It refuses when `NODE_ENV=production`,
         but it doesn't know about your laptop's shell.

## 2. Upstash: the shared rate limiter

1. [ ] <https://console.upstash.com> → **Create database** (Redis), in the region from step 0.
       The free tier is plenty.
2. [ ] In the database's **REST API** section, copy **`UPSTASH_REDIS_REST_URL`** and
       **`UPSTASH_REDIS_REST_TOKEN`** 🔒.

(Upstash is optional: without it, the app works and logs a startup warning, and each serverless
instance rate-limits on its own. The database enforces one response per person either way.)

## 3. Vercel: the app

1. [ ] <https://vercel.com> → **Add New → Project** → import the GitHub repo. The Next.js
       framework preset is detected. Leave the build and install commands as they are
       (`npm ci` runs `prisma generate` automatically).
2. [ ] **Environment variables.** Add these for the **Production** environment before the first
       deploy:

       | Variable | Value |
       |---|---|
       | `DATABASE_URL` | Supabase **transaction pooler** URL (port 6543), **without** `?sslmode=…` |
       | `DATABASE_SSL_CA` | The whole certificate file's text, including the BEGIN/END lines |
       | `DATABASE_POOL_MAX` | `3` (optional; this is the production default) |
       | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | From Google Cloud (step 4) |
       | `NEXTAUTH_SECRET` | From step 0 |
       | `NEXTAUTH_URL` | `https://<your-project>.vercel.app` for now; update it if you add a custom domain |
       | `PARTICIPANT_HASH_SECRET` | From step 0 |
       | `ADMIN_EMAILS` | Your Google email(s), comma-separated |
       | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | From step 2 |

       Don't set `DIRECT_URL` or `TEST_DATABASE_URL` on Vercel.
3. [ ] **Settings → Functions → Function region**: choose the region from step 0 (e.g. `iad1`).
       Otherwise every database query crosses the ocean.
4. [ ] **Settings → Build and Deployment → Node.js version**: 22.x.
5. [ ] **Deploy.** If you changed `NEXTAUTH_URL` after the first deploy, redeploy. Environment
       variables only apply to new deployments.
6. [ ] **Plan terms.** The free Hobby plan is for personal, non-commercial projects. Check
       whether your lab or institution's study needs **Pro**.

## 4. Google OAuth for production

In Google Cloud Console, on the OAuth client you created for local testing (or a new one):

1. [ ] **Authorized JavaScript origins**: add `https://<your-project>.vercel.app`.
2. [ ] **Authorized redirect URIs**: add `https://<your-project>.vercel.app/api/auth/callback/google`.
3. [ ] **Audience → Publish app**. While it's in testing mode, only listed test users can sign in.
       The app only asks for basic scopes (`openid email profile`), so no verification review is
       needed.

## 5. Smoke test, then clear the test data

1. [ ] Open the site, tick consent, sign in, and complete the study once yourself.
2. [ ] Sign in again: you should see "You've already completed this study, thank you."
3. [ ] Open `/admin` with an `ADMIN_EMAILS` account: the counts show 1 completed. Download both
       CSVs.
4. [ ] Open `/admin` with a non-admin account: you should get a 404.
5. [ ] **Delete your test data before launch.** In Supabase's **SQL editor**:
       ```sql
       TRUNCATE participants CASCADE;  -- also deletes their responses
       ```
       Only do this before real data collection starts.

## 6. Launch checklist

- [ ] Real study text in `src/config/study.ts` and real scenarios in `data/scenarios.json`
      (zero-padded IDs such as `s01`). Deploy, then check the Vercel logs for
      `[startup] env ok; N scenarios loaded`.
- [ ] `PARTICIPANT_HASH_SECRET` backed up somewhere safe outside Vercel.
- [ ] Supabase backups on (Pro), Data API off, SSL enforced.
- [ ] The Google app is published.
- [ ] The test data is cleared.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `self-signed certificate in certificate chain` | `DATABASE_SSL_CA` is missing, or you pasted the wrong file |
| Startup error "remove sslmode from DATABASE_URL" | Delete `?sslmode=…` from `DATABASE_URL`. `DATABASE_SSL_CA` handles TLS |
| `redirect_uri_mismatch` on sign-in | The Google redirect URI doesn't exactly match `NEXTAUTH_URL` + `/api/auth/callback/google` |
| Every form submit fails with `bad_origin` | `NEXTAUTH_URL` doesn't match the address in the browser (for example, you added a custom domain but didn't update `NEXTAUTH_URL` and redeploy) |
| Sign-in fails on **preview** deployments | Expected. Previews have different URLs than `NEXTAUTH_URL` and the Google client. Test on production |
| `too many connections` / pooler errors | Make sure `DATABASE_URL` is the **transaction pooler** (port 6543), not the direct connection |
| `prisma migrate deploy` hangs or can't connect | Use the **session pooler** URL for `DIRECT_URL`. The direct connection needs IPv6 |
| `/admin` shows 404 for you | Your email isn't in `ADMIN_EMAILS`, or it was added after you signed in. Sign out and back in |
