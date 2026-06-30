# @shesa/finance — finance dashboard (Vite SPA)

Runs at `finance.shesa.test:3003` locally and `finance.shesa.org` in staging / prod. An internal-facing dashboard for the treasury / charges / obligations / payments work that lands in Phase 3.

Vite + React, not Next.js — no SEO needs (members-only), no SSR benefit, and the simpler bundle ships faster on Cameroonian 3G.

## Phase 0 scope

- Vite + React + Tailwind + react-router + TanStack Query + Zustand toolchain stitched together.
- Single placeholder route at `/`.
- **Not protected yet.** SPAs can't read the apex-scoped `httpOnly` session cookie that apps/auth writes; bridging that requires a small CORS-credentialed `/api/session` endpoint on apps/auth, deferred to Phase 1+ when the first authenticated finance route lands.

## Local dev

```bash
pnpm db:start
pnpm env:init
pnpm --filter @shesa/finance dev   # → http://localhost:3003

# Or via the compose stack:
docker compose -f infra/docker-compose.dev.yml up finance
```
