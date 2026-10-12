# Onboarding

> **The concrete Phase 0 setup lives in [phase-0/local-setup.md](phase-0/local-setup.md) and the full runbook at [runbooks/local-dev-setup.md](runbooks/local-dev-setup.md).** This file is the pre-scaffolding orientation; the sections below overlap those docs. When they disagree, the phase-0/ docs win.

Welcome to Shesa. This guide gets you from a fresh laptop to a running local stack.

---

## Before you start

You need:

- A reasonably-recent macOS or Linux machine (Windows via WSL2 should work but isn't first-class)
- A GitHub account with access to the Shesa repo
- Your SSH key registered in GitHub

## 1. Install prerequisites

_(Exact commands populate when the monorepo is scaffolded. Expected toolchain:)_

- **Node** — version pinned via `.nvmrc` / Volta / mise (TBD at scaffolding time)
- **pnpm** — see [ADR-0021](adr/0021-monorepo-pnpm-turborepo.md)
- **Docker** + **Docker Compose** — for the local Supabase stack
- **Supabase CLI** — for the local database, Auth, Storage, and Edge Function runtime

```bash
# macOS examples
brew install node pnpm docker supabase/tap/supabase
```

## 2. Clone and install

```bash
git clone git@github.com:<org>/shesa.git
cd shesa
pnpm install
```

## 3. Set up local environment

_(populates when `.env.example` exists)_

```bash
cp .env.example .env
# fill in any values the file calls out
```

The local Supabase stack uses `.env` for its anon key / service-role key / DB URL. The Supabase CLI generates these on first start.

## 4. Start local Supabase

```bash
supabase start
```

This brings up Postgres, GoTrue (Auth), Storage, the Realtime server, and the Edge Function runtime — all in Docker. The output prints the local API URL, anon key, service-role key, and Studio URL. Copy them into `.env`.

To stop:

```bash
supabase stop
```

## 5. Apply migrations + seed

```bash
pnpm db:migrate   # supabase db push (against local)
pnpm db:seed      # seed fixtures
pnpm db:types     # supabase gen types → packages/supabase/types.gen.ts
```

_(These scripts land when the DB sector ships — currently the monorepo is scaffolded but the schemas are empty.)_

## 6. Run the apps

_(populates when apps are scaffolded — `apps/{web,exco,finance,connect}/` will exist after Phase 0)_

```bash
pnpm dev                          # all apps in parallel via Turborepo
pnpm --filter @shesa/web dev      # one app
```

Each app boots on its own port (printed at startup). Open the Supabase Studio URL printed by `supabase start` to browse the local database.

## 7. Verify it worked

- [ ] `supabase status` shows all services running.
- [ ] Each app loads in the browser without errors.
- [ ] You can sign up via Supabase Auth in the local app.
- [ ] `pnpm test` passes.

---

## Read these next

Before opening your first pull request:

1. [docs/standards/git-conventions.md](standards/git-conventions.md) — how to commit and open a PR
2. [docs/standards/documentation.md](standards/documentation.md) — how to update docs as you go
3. The standards for the area you're working in:
   - Frontend: [docs/standards/frontend.md](standards/frontend.md) + [docs/standards/frontend-network.md](standards/frontend-network.md)
   - Backend / Server Actions / Edge Functions: [docs/standards/backend.md](standards/backend.md)
   - Infra: [docs/standards/infra-devops.md](standards/infra-devops.md)
4. [docs/glossary.md](glossary.md) — what domain terms mean here
5. Skim the [ADRs](adr/) relevant to your area — they explain _why_
6. [docs/roadmap.md](roadmap.md) — the phased build plan

## If something doesn't work

- Re-read the prerequisite step you skipped (we've all done it).
- Check [docs/runbooks/](runbooks/) for known-bad-state recovery.
- `supabase stop && supabase start` resets the local stack (data is lost).
- Ask in the team channel — and if the doc was unclear, open a PR to fix it. **Onboarding bugs are bugs.**

## What's intentionally missing today

The repo is in initial setup. Still pending:

- **Monorepo scaffolding** for `apps/{web,exco,finance,connect}/` and `packages/{ui,types,domain,supabase}/` — Phase 0.
- **Database migrations + seeds** — land with the Core Domain sector (Phase 1).
- **CI/CD workflows** in `.github/workflows/` — Phase 0.
- **Docker Swarm `infra/`** layout — Phase 0.

See [docs/roadmap.md](roadmap.md) for the full phased plan.
