# @shesa/web — public website + CMS

Runs at `web.shesa.test:3000` locally, `staging.shesaconnect.com` on staging, and `shesaconnect.com` / `www.shesaconnect.com` in production. Two responsibilities:

1. **Public website** — landing pages, member-facing content, the kind of thing search engines index. Next.js (SSR + ISR) for SEO and first-paint speed.
2. **CMS routes** (Phase 5) — authoring UI for editors. Gated behind the apex-domain session cookie; uses Server Actions for mutations per ADR-0033.

The two live in the same Next app rather than split as `apps/web` + `apps/cms` because the CMS data primarily _renders_ on the public site; co-locating cuts an inter-app refetch step out of the hot path.

## Phase 0 scope

- Boot the Next app shell on port 3000.
- Read the cross-subdomain session cookie (if present) so the placeholder homepage can show "Signed in as …" vs "Sign in →".
- Middleware refreshes the session on every request (same pattern as `apps/auth`).
- No CMS routes yet — `/admin` is a Phase 5 deliverable.

## Local dev

```bash
pnpm db:start
pnpm env:init
pnpm --filter @shesa/web dev    # → http://localhost:3000

# Or as part of the docker compose stack:
docker compose -f infra/docker-compose.dev.yml up web
```
