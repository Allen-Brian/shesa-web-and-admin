# @shesa/exco — Executive Committee dashboard (Vite SPA)

Runs at `exco.shesa.test:3002` locally and `exco.shesa.org` in staging / prod. Members-only operational dashboard for executives — member management, role grants, audit views, finance summaries.

Vite + React, not Next.js — no SEO needs (members-only), no SSR benefit, ship a smaller bundle for Cameroonian 3G.

## Phase 0 scope

- Toolchain stitched (Vite + React + Tailwind + react-router + TanStack Query + Zustand).
- Single placeholder route at `/`.
- **Not protected yet** — see `apps/finance/README.md` for the SPA-vs-`httpOnly`-cookie note.

## Local dev

```bash
pnpm db:start
pnpm env:init
pnpm --filter @shesa/exco dev   # → http://localhost:3002

# Or via the compose stack:
docker compose -f infra/docker-compose.dev.yml up exco
```
