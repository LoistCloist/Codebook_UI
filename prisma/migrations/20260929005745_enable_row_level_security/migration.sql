-- Hosted Postgres providers such as Supabase expose tables in the public schema through an
-- auto-generated REST/GraphQL API. Enabling row-level security with no policies makes
-- those APIs return nothing. The app connects as the table owner, which bypasses RLS
-- (no FORCE), so the app itself is unaffected. Harmless on plain Postgres.
ALTER TABLE "participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "responses" ENABLE ROW LEVEL SECURITY;
-- Conditional: Prisma's shadow database (used by `migrate dev`) has no _prisma_migrations table.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
