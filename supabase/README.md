# Supabase

The Shesa database, auth, storage, and Edge Function layer. Local development uses the Supabase CLI's Docker stack; `develop` and `main` branches target shared cloud projects via CI auto-deploy.

```
supabase/
├── config.toml              project + Studio + auth + API config (committed)
├── seed.sql                 shared dev/staging test fixtures (committed; never run in prod)
├── migrations/              timestamped SQL migrations (committed; source of truth)
│   └── <ts>_<name>.sql
├── functions/               Edge Functions, one folder per function (added from E8)
└── .temp/                   local CLI state (gitignored — holds project link, etc.)
```

## The three environments

| Env        | Where         | Branch      | How migrations apply                 | Seed applied?                             |
| ---------- | ------------- | ----------- | ------------------------------------ | ----------------------------------------- |
| Local      | Docker (CLI)  | `feature/*` | `pnpm db:reset` re-runs all + seed   | Yes, every reset                          |
| Staging    | Cloud project | `develop`   | CI on merge (E13) — `db push` + seed | Yes, after each migration push            |
| Production | Cloud project | `main`      | CI on merge (E13) — `db push` only   | **Never** — prod data is real, not seeded |

## Day-one local workflow

```bash
pnpm db:start        # pulls Supabase Docker images on first run (~2 GB), then boots
pnpm db:status       # prints API URL + anon/service-role keys for the local stack
pnpm env:init        # writes .env.local — captures the keys above automatically
pnpm db:types        # regenerates packages/supabase/src/types.gen.ts from the live local schema
pnpm dev             # starts the apps (once they're scaffolded in E9/E10)
```

To reset local DB (drops everything, re-runs migrations + seed):

```bash
pnpm db:reset
```

## Adding a migration

```bash
pnpm db:migrate:new <descriptive_name>   # creates supabase/migrations/<ts>_<descriptive_name>.sql
```

Edit the new file. Then to apply locally:

```bash
pnpm db:migrate                # apply pending migrations
# OR
pnpm db:reset                  # full reset + re-apply + re-seed
```

Once committed and merged to `develop`, CI applies it to staging automatically. Promote to `main` to roll out to prod.

## Migration conflicts and merge order

When two devs add migrations to the same model in parallel branches, here's what actually happens.

### Ordering rule: filename timestamp

Supabase tracks applied migrations in `supabase_migrations.schema_migrations` (a row per filename). On every `supabase db push`, the CLI applies any **missing** migrations in **filename-timestamp order** — not commit order, not merge order. The filename is the source of truth.

`pnpm db:migrate:new <name>` produces `<YYYYMMDDHHMMSS>_<name>.sql` automatically, so timestamps don't collide between devs as long as nobody hand-renames a file.

### Three scenarios

**1. Independent tables — the easy case.**

```
Dev A:  20260629_100000_add_currency_rates.sql      (touches finance.currency_rates)
Dev B:  20260629_110000_add_member_phone.sql        (touches core.members)
```

Both PRs merge to `develop`. CI applies in timestamp order: A, then B. Staging ends up with both. No conflict.

**2. Same table, additive changes.**

```
Dev A:  20260629_100000_add_member_phone.sql        (ALTER TABLE core.members ADD COLUMN phone TEXT)
Dev B:  20260629_110000_add_member_email.sql        (ALTER TABLE core.members ADD COLUMN email TEXT)
```

Both apply cleanly in order. Staging has both columns.

**3. Out-of-order timestamps — the gotcha.**

- Dev B branches off `develop` on Monday, creates `20260629_100000_B.sql`.
- Dev A branches the next day, creates `20260630_100000_A.sql` (newer timestamp).
- Dev A merges first (Wednesday). CI applies `A` to staging.
- Dev B's PR still in review. Friday it merges.

Now `develop` has both files. CI sees one new migration to apply (B's). It applies `20260629_100000_B.sql` **after** A's, even though B's timestamp is older. **Dev B tested B locally against a DB that did not have A applied** — if B's SQL references something A altered, it fails at staging-apply time, leaving the deploy half-done.

### Two rules and one safety net that prevent this

**Rule 1 — Rebase onto `develop` before merge.** When your PR is ready and `develop` has moved on, rebase (or merge `develop` into your branch). The PR's CI then runs against a fresh DB with every migration applied in real order, including any that merged ahead of you. If your migration breaks after the others land, CI catches it before merge.

**Rule 2 — If your timestamp is now older than something on `develop`, rename the file.** Don't ship out-of-order:

```bash
# Old: 20260629_100000_B.sql, but 20260630_100000_A.sql is already on develop
mv supabase/migrations/20260629_100000_B.sql \
   supabase/migrations/$(date -u +%Y%m%d%H%M%S)_B.sql
git add -A && git commit --amend
```

This guarantees B applies after A everywhere — local, staging, prod. The CLI won't complain because the filename is "new" everywhere.

**Safety net — CI runs every PR against a fresh DB.** The `db-test.yml` workflow (lands in E13) starts from empty, applies every migration in order, runs `pnpm db:test`. If two devs' migrations are incompatible, CI fails the second PR's status check; merge stays blocked until the rebase + fix.

## Choosing a target

Every database command names the database it is about to touch:

```bash
pnpm db <command> [--target local|production]
```

The target resolves in this order: the `--target` flag, then the
`SHESA_DB_TARGET` environment variable, then **`local`**. Local is the default
on purpose — the safe target should be the one you get when you have not
thought about it.

```bash
pnpm db reset                              # local
pnpm db diff --target production           # production
SHESA_DB_TARGET=production pnpm db diff    # production, for a whole shell
```

The wrapper exists because the Supabase CLI decides what it is talking to from
remembered state — whichever project you last ran `supabase link` against.
Nothing in a bare CLI command tells you which database it will hit, and nothing
stops `db reset` (which **drops everything**) from landing on production
because you linked it an hour ago and forgot. `scripts/db.mjs` prints the
target before acting, re-links to match, and classifies each command:
read-only, writes-to-target, or local-only.

Production credentials come from `.env.production`, never `.env.local`.

### Things you actually run

| Situation                                                      | Command                                      |
| -------------------------------------------------------------- | -------------------------------------------- |
| See if your branch has migrations that diverge from `develop`  | `git diff develop -- supabase/migrations/`   |
| Rebuild your local database from scratch                       | `pnpm db reset`                              |
| Run the pgTAP suite                                            | `pnpm db test`                               |
| Regenerate TypeScript types after a schema change              | `pnpm db types`                              |
| Compare your migrations against what production actually has   | `pnpm db diff --target production`           |
| Apply pending migrations to production (breakglass)            | `pnpm db push --target production --confirm` |
| Sync schema **from** production back to local (drift recovery) | `pnpm db:pull`                               |

### One-line rules to internalize

- **Filename = ordering.** Commit order doesn't matter. Merge order doesn't matter. Filename does.
- **Migration history on `develop`/`main` is immutable.** Once merged, never edit; supersede with a new migration.
- **Schema drift is a thing to watch for.** `pnpm db:diff:remote` against staging right after a deploy should return nothing — if it shows differences, someone made a manual change in the Supabase dashboard (don't).

## Adding test fixtures (shared dev data)

`seed-demo.sql` is the contract for test data every dev sees. (`seed.sql` is the production bootstrap — put fixtures in the demo file, not there.) When you need a fixture another phase will rely on (e.g. an Exco-created Member that Connect needs for forum testing), add an `INSERT` to `seed.sql` using a **stable UUID** and `ON CONFLICT DO NOTHING`. Commit. Every dev's `pnpm db:reset` and staging's next deploy will pick it up.

Never put real PII in either seed file — both are committed to the repo.

## Manual cloud commands (breakglass)

Day-to-day you don't need these — CI handles staging/prod deploys. They exist for debugging or emergency interventions.

```bash
pnpm db:link --env production                 # link the CLI to the production project
pnpm db diff  --target production             # what has drifted?
pnpm db types --target production             # regenerate TS types from production's schema
pnpm db push  --target production --confirm   # apply pending migrations
pnpm db seed  --target production --confirm   # apply the bootstrap seed
pnpm db:pull                                  # pull schema from the linked project (drift recovery)
```

Writes to production require `--confirm` **and** typing the project ref at a prompt. Typing the ref rather than "yes" is deliberate — it makes you look at which project you are about to change. `pnpm db reset` and `pnpm db seed-demo` refuse to target production at all; a production rebuild goes through [`docs/runbooks/prod-database-reset.md`](../docs/runbooks/prod-database-reset.md).

## Why two layers (Docker local + Cloud staging/prod)

- **Local Docker**: each dev gets their own DB sandbox. Migrations / `db:reset` / experiments don't affect anyone else. Iteration is instant. Offline development works.
- **Cloud staging**: shared state so the Exco dev's seeded Members are visible to the Connect dev developing the forum against `develop`. Without the shared cloud, every cross-team test would require manual fixture coordination.
- **Cloud prod**: real user data, never reset, never seeded, never pushed to without CI gates.

## Schema ownership map (per `feedback_schemas_per_phase`)

Each phase creates its own schema(s) when it needs them. The eventual layout:

| Schema          | Owns                                             | Created in    |
| --------------- | ------------------------------------------------ | ------------- |
| `core`          | Identity, members, scopes, roles & permissions   | E2 (✓ landed) |
| `audit`         | `audit_entries` + audit helpers                  | E4            |
| `notifications` | Notification events, deliveries, templates, pgmq | E6            |
| `finance`       | Charges, obligations, payments, treasury         | Phase 3       |
| `cms`           | Public website, articles, gallery, Echoes        | Phase 5       |
| `connect`       | Forums, jobs, achievements, live sessions        | Phase 8       |

See [ADR-0003](../docs/adr/0003-schema-per-domain-single-postgres.md).
