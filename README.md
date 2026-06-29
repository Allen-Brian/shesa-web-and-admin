# Shesa

Shesa is a multi-app platform for managing a Cameroonian membership organization across its branches, chapters, and batches — governance (Exco), finances (charges, treasury, mobile-money payments), public website (CMS, Echoes, Stream), and a future member-to-member layer (Connect).

It's built as a pnpm + Turborepo monorepo on Supabase, deployed via Docker Swarm on a Contabo VPS behind Cloudflare.

---

## Status

**Phase 0 — Foundation & Project Setup.** No product features are built yet; the platform foundations are coming online (monorepo, Supabase schemas, RBAC, audit, notifications, central auth, app shells, CI/CD, infra). See [`docs/roadmap.md`](docs/roadmap.md) for the full phased plan, and `docs/phase-0/` (lands during Phase 0) for the current implementation details.

---

## Quick start

**Prerequisites**

- Node `22+` (see `.nvmrc`)
- pnpm `9.15+` (managed via `corepack` — the repo's `packageManager` field pins the exact version)
- Docker (for local Supabase via the Supabase CLI)
- Supabase CLI (`brew install supabase/tap/supabase`)
- Git

**Clone & install**

```bash
git clone git@github.com:<org>/shesa.git
cd shesa
corepack enable
pnpm install
```

**Local dev** _(scripts come online as each epic lands — see `docs/phase-0/`)_

```bash
pnpm dev          # all apps in parallel via Turborepo
pnpm lint         # ESLint across the monorepo
pnpm typecheck    # tsc --noEmit across the monorepo
pnpm test         # Vitest across the monorepo
```

---

## Repository layout

```
apps/             # Next.js apps: web, auth, exco, finance, connect
packages/         # Shared: ui, types, domain, supabase, config, eslint-config, tsconfig
supabase/         # Migrations, Edge Functions, seed, local config, pgTAP tests
infra/            # Docker Swarm stack files, Caddyfile, deploy runbooks
.github/          # GitHub Actions workflows + PR template
docs/             # Plain-markdown docs (viewed on GitHub; no docs site)
```

---

## Documentation

- [`docs/README.md`](docs/README.md) — entry point
- [`docs/roadmap.md`](docs/roadmap.md) — phased build plan
- [`docs/onboarding.md`](docs/onboarding.md) — getting set up locally
- [`docs/standards/`](docs/standards/) — frontend, backend, infra, git, docs conventions
- [`docs/adr/`](docs/adr/) — architecture decision records
- [`docs/glossary.md`](docs/glossary.md) — domain language

---

## License

Proprietary. All rights reserved.
