# Migrations

Supabase CLI + timestamped SQL files. Same shape as any Postgres migration tool — the specifics are here.

## Author a new migration

```bash
pnpm db:migrate:new <descriptive-name>
# → supabase/migrations/YYYYMMDDHHMMSS_<descriptive-name>.sql
```

Write forward-only SQL. Don't rely on the migration being re-runnable without a `db:reset` — Supabase applies each file once and records it in `supabase_migrations.schema_migrations`.

**Timestamp collisions.** Two branches authoring migrations concurrently can produce the same timestamp. If yours conflicts at merge, rename the file to a newer timestamp before merging — the schema-migrations table is ordered lexicographically.

## Apply locally

```bash
pnpm db:migrate       # apply pending migrations
pnpm db:reset         # wipe + rerun everything + reseed (destructive)
pnpm db:diff          # show what a migration would look like from the current DB state
```

`db:reset` is the safe path when you've been iterating — it rebuilds the DB from `supabase/migrations/*.sql` + `supabase/seed.sql`. Faster than trying to roll individual migrations back.

## Ship to staging / production

Migrations apply automatically on merge:

- Merge to `develop` → `deploy-staging.yml` runs `supabase link --project-ref <staging_ref> && supabase db push` before the container redeploy.
- Merge to `master` → `deploy-production.yml` does the same for prod, gated by the GitHub Environment approval.

**Never run `db:push` manually against prod.** The workflow does it after linking to the right project, using the `SUPABASE_ACCESS_TOKEN` scoped to that environment. Running it locally with your own token bypasses the audit trail the workflow leaves.

## Rolling back a migration

Postgres migrations aren't reversible in general — data loss is possible. The Shesa way:

1. **Roll forward.** Write a new migration that reverses the offending change (add column back, restore constraint, etc.). Ship it as a normal PR.
2. **Never edit a migration that's been merged to `develop`.** The staging DB has already applied it and won't re-apply the same timestamp. Editing produces two DBs with the same migration name but different content.

Emergency exceptions: talk to whoever owns the environment first. `supabase migration repair --status reverted <timestamp>` on a linked project marks it as un-applied but doesn't undo its schema effects — the follow-up migration still has to.

## pgTAP tests

Every DB-level test lives under `supabase/tests/*.test.sql`. `pnpm test:db` runs them via `supabase test db`, which spins up a scratch schema, applies migrations, runs the assertions, tears down.

Add a new test file when a migration introduces a new RLS policy or security-definer function that isn't already covered. The template is:

```sql
BEGIN;
SELECT plan(<N>);
-- assertions
SELECT * FROM finish();
ROLLBACK;
```

See `supabase/tests/rls_core.test.sql` for the canonical pattern (both deny-path AND happy-path assertions per policy).
