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

## Adding test fixtures (shared dev data)

`seed.sql` is the contract for test data every dev (and staging) sees. When you need a fixture another phase will rely on (e.g. an Exco-created Member that Connect needs for forum testing), add an `INSERT` to `seed.sql` using a **stable UUID** and `ON CONFLICT DO NOTHING`. Commit. Every dev's `pnpm db:reset` and staging's next deploy will pick it up.

Never put real PII in `seed.sql` — it's committed to the repo and applied to every env except prod.

## Manual cloud commands (breakglass)

Day-to-day you don't need these — CI handles staging/prod deploys. They exist for debugging or emergency interventions.

```bash
pnpm db:link --env staging         # link the CLI to the staging cloud project
pnpm db:link --env production      # link to prod (read-only intent — pushes need --confirm)
pnpm db:diff:remote                # diff local schema against the linked project
pnpm db:push                       # apply local migrations to the linked project (with safety rails)
pnpm db:pull                       # pull schema from the linked project (drift recovery)
pnpm db:types:remote               # regenerate TS types from the linked project's schema
```

`pnpm db:push` won't run from a feature branch by default (only from `develop` or `main`). Production pushes additionally require `--confirm` and a typed `PRODUCTION` prompt — see `scripts/db-push.mjs`.

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
