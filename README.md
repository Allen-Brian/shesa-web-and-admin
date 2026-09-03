# Shesa

Shesa is a platform for running a Cameroonian membership organisation
across its branches, chapters, houses and batches: governance, finances,
and the public website.

It is a pnpm + Turborepo monorepo. Everything persistent lives in
Supabase — Postgres with row-level security, Auth, Storage, Edge
Functions and pg_cron — and the two Next.js apps are hosted on Vercel
([ADR-0042](docs/adr/0042-vercel-plus-supabase-hosting.md), which superseded
the earlier Docker Swarm plan).

---

## The two apps

| App          | Port | What it is                                                                                                                              |
| ------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`   | 3000 | The public site — news, projects, events, gallery, leadership, organs, songs, AGM registration. Fully public, no auth-gated routes.     |
| `apps/admin` | 3002 | The signed-in surface, one app with three personas: **Exco** (governance), **Finance** (charges, treasury, payments), **Editor** (CMS). |

[ADR-0040](docs/adr/0040-consolidated-admin-app-per-app-auth.md) merged
what used to be five apps into these two. Accounts are invite-only:
there is no sign-up route, and every account is created by an
administrator through `auth.admin.inviteUserByEmail`.

---

## Quick start

**Prerequisites**

- Node `22+` (see `.nvmrc`)
- pnpm `9.15+` via `corepack` — `packageManager` pins the exact version
- Docker, for the local Supabase stack
- Git

```bash
corepack enable
pnpm install
pnpm db:start        # local Supabase (Postgres, Auth, Storage, Studio)
pnpm db:reset        # migrations + seed.sql + seed-demo.sql
pnpm dev             # both apps via Turborepo
```

`pnpm db:reset` gives you the production bootstrap **plus** demo data:
160 members, a year of synthetic finance history, and placeholder CMS
content. Production gets `seed.sql` only.

---

## Talking to a database

Every `db:*` script takes a target, so the same commands drive the local
stack and the hosted project:

```bash
pnpm db:reset                          # local (the default)
pnpm db:types --target production      # regenerate types from prod
pnpm db:push  --target production --confirm
```

Resolution order is `--target` → `SHESA_DB_TARGET` → `local`. Commands
that write to a hosted database require `--confirm`; commands that only
make sense locally (`start`, `stop`, `reset`, `test`) refuse a production
target outright. See [`scripts/db.mjs`](scripts/db.mjs).

Resetting production is a separate, deliberate procedure:
[`docs/runbooks/prod-database-reset.md`](docs/runbooks/prod-database-reset.md).

---

## Checks

```bash
pnpm lint                # ESLint across the monorepo
pnpm typecheck           # tsc --noEmit across the monorepo
pnpm test                # Vitest — 212 unit tests
pnpm db:test             # pgTAP — 32 suites, 319 assertions (needs db:start)
pnpm check:filenames     # every filename must be self-describing (frontend.md §5)
pnpm check:deno-mirrors  # the generated Deno copy still matches its source
```

CI runs all but `db:test` on every PR; `db-test` is its own required
workflow, gated on changes under `supabase/`.

Two of these deserve a word, because both replace a comment that claimed
a control which did not exist:

- **`check:filenames`** enforces that a filename says what the file is
  without its directory. The repository once held 19 files called
  `actions.ts` and 19 called `types.ts`.
- **`check:deno-mirrors`** regenerates the Deno copy of the member-import
  validator from `packages/domain` and fails if the committed file has
  gone stale. Two hand-kept copies had already drifted.

The ESLint preset also carries `shesa/no-server-imports-in-client`, which
fails the build if a file marked `'use client'` imports the service-role
Supabase client or the server environment.

---

## Repository layout

```
apps/web/          Public site (Next.js 15, App Router)
apps/admin/        Exco + Finance + Editor personas (Next.js 15)
packages/
  ui/              Design system — shadcn primitives + Shesa components
  domain/          Pure business logic: RBAC, finance, memberships, imports
  types/           Shared types, permission keys, audit actions
  supabase/        Client factories + generated database types
  config/          Zod-validated env schemas, security headers
  eslint-config/   Flat presets, including the server/client import firewall
  tsconfig/        Shared TypeScript bases
supabase/
  migrations/      Three baseline files + everything since; _archive/ holds the 112 originals
  functions/       Deno Edge Functions — all authenticated writes go through these
  tests/           pgTAP suites
  seed.sql         Production bootstrap
  seed-demo.sql    Local-only demo data — never run against production
docs/              Standards, ADRs, runbooks
infra/             Vercel config; the superseded Swarm stack is kept for history
```

---

## How writes work

Two layers, deliberately ([ADR-0006](docs/adr/0006-casl-for-authorization.md), [ADR-0033](docs/adr/0033-server-action-thin-glue-edge-function-authority.md)):

1. **RLS is the floor.** Every table in the six app schemas has it
   enabled — `core`, `audit`, `notifications`, `exco`, `finance`, `cms` —
   and `core.has_permission(user, scope, key)` walks the scope ancestry
   to answer each check.
2. **Edge Functions are the authority.** Authenticated writes go through
   `supabase/functions/`, which validate, authorise, and audit. RLS is
   what stops a request that bypasses them, not the only thing standing
   between a caller and the data.

A note that has cost this codebase real bugs: `verify_jwt` on an Edge
Function is a _signature_ check, not an authorisation check. The public
anon key is a valid project JWT.

---

## Documentation

- [`docs/README.md`](docs/README.md) — entry point
- [`docs/standards/`](docs/standards/) — frontend, backend, infra, git, docs
- [`docs/adr/`](docs/adr/) — architecture decision records
- [`docs/runbooks/`](docs/runbooks/) — operational procedures
- [`docs/glossary.md`](docs/glossary.md) — domain language

---

## License

Proprietary. All rights reserved.
