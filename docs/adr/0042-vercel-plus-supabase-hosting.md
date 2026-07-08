# 0042 — Vercel + Supabase hosting (supersedes ADR-0026 Swarm)

- **Status:** accepted
- **Date:** 2026-07-08
- **Deciders:** Lead
- **Supersedes:** [ADR-0026](0026-docker-swarm-for-staging-prod.md) (Docker Swarm on Contabo VPS)

## Context

[ADR-0026](0026-docker-swarm-for-staging-prod.md) put staging and production on Docker Swarm on a Contabo VPS. At the time, that decision made sense: one machine, one billing line, native secrets, headroom for a future Node worker container. Vercel was **considered and rejected** back then, specifically because it "complicates secret sharing with the future worker container."

Three things have changed since:

1. **[ADR-0040](0040-consolidated-admin-app-per-app-auth.md) collapsed the app list from five to two** (`web` public site + `admin` merged Exco/Finance/Editor). Fewer moving parts to host means the operational overhead of running our own orchestrator no longer amortizes across many apps.

2. **Background-job strategy is Edge-Functions-first (ADR-0032).** Supabase Edge Functions cover 400s runtime + 256MB, and pg_cron handles scheduled work. A permanent Node worker on the VPS was hypothetical when ADR-0026 was written; two months in, no job on our roadmap has approached those Edge Function limits. If one eventually does, we spin up a small VPS on demand — no need to keep one running for a hypothetical future job.

3. **Ops burden is real at this team size.** With one lead engineer, every hour spent on kernel patches, TLS renewal edge cases, fail2ban tuning, log rotation, and disk-full alerts is an hour NOT shipping product. The Swarm setup work already surfaced this — provisioning was straightforward but visibly not free.

Meanwhile Supabase carries the whole persistent backend surface: Postgres (with RLS), Auth, Storage, Edge Functions, pg_cron, Realtime. The only thing left to host is the two Next.js apps.

## Decision

**Move `web` and `admin` to Vercel. Cancel the Contabo VPS. Keep local dev on Docker (unchanged).**

- **Four Vercel projects**, one per app per env:
  - `shesa-web-staging` (tracks `develop`) → `staging.shesaconnect.com`
  - `shesa-web-prod` (tracks `master`) → `shesaconnect.com` (+ `www.`)
  - `shesa-admin-staging` (tracks `develop`) → `staging-admin.shesaconnect.com`
  - `shesa-admin-prod` (tracks `master`) → `admin.shesaconnect.com`
- **Region:** all four pinned to Frankfurt (`fra1`) to stay close to Supabase EU.
- **GitHub integration:** Vercel's GitHub app watches the two branches; no custom deploy workflow needed. Preview deploys per PR are enabled on the staging projects only.
- **Cloudflare** stays as the zone / DNS provider but its proxy is **disabled** (grey cloud) on the Vercel-managed hostnames. Vercel does its own TLS + edge caching; layering Cloudflare's proxy on top breaks cert challenges and adds latency.
- **Cross-app auth cookies** scoped to `.shesaconnect.com` — same pattern as ADR-0026, works identically on Vercel.
- **Local dev stays dockerized** ([ADR-0026's local-dev half remains valid](0026-docker-swarm-for-staging-prod.md)). Only the staging + prod Swarm stack is retired.
- **Background jobs** remain on Supabase Edge Functions + pg_cron per [ADR-0032](0032-hybrid-background-jobs.md). The "add a Node worker VPS on demand" escape hatch is still open — we just don't pre-provision one.

## Consequences

**Simpler ops:**

- No VPS to patch, no cert to renew manually, no fail2ban to babysit, no swarm secrets to rotate by hand.
- Rollback is a single click in the Vercel dashboard, not `git reset --hard` + `docker stack deploy`.
- Preview deploys per PR — reviewers get a working URL without checking out the branch.

**Simpler CI:**

- Delete `deploy-staging.yml` and `deploy-production.yml` (the Docker-based ones). Vercel builds on git push automatically.
- Migrations still run through their own GitHub Action (`supabase link + supabase db push`) — decoupled from the app deploy path.

**Dead code removed in the same PR:**

- `infra/swarm/` (compose stack, secrets runbook, DNS doc)
- `infra/caddy/Caddyfile.prod`
- `infra/docker/Dockerfile.next.prod` (and `Dockerfile.vite.prod`, obsolete since ADR-0040)
- Both `deploy-*.yml` workflows.

**New trade-offs we accept:**

- **Vercel coupling.** Some Vercel-specific runtime features (Edge Runtime, ISR revalidation semantics, image optimization CDN) are load-bearing. Migrating off Vercel later means picking those apart — realistic but not zero cost. Mitigated by keeping app code framework-idiomatic (no `@vercel/*` imports outside a thin adapter layer).
- **Bandwidth-based pricing.** Contabo's flat monthly rate is protective against traffic spikes. Vercel bills bandwidth above the tier limit — a viral moment could produce a bill surprise. For a Cameroon association's traffic profile in Phase 0–3, the Hobby free tier's 100GB/month is comfortable.
- **Cookie leakage between staging and prod.** Both envs share `.shesaconnect.com`, so a browser holding a prod cookie will present it to staging. Same caveat as under Swarm — unchanged.
- **No compute for future workers on the same box.** When (if) a background job outgrows Edge Functions, we provision a separate small VPS at that point. Documented in ADR-0032. Not a regression from Swarm, since the "Node worker alongside apps" plan was always contingent.

**Migration mechanics:**

- Contabo instance can be cancelled once Vercel staging deploy is green end-to-end.
- Cancel auto-renewal, let the current billing cycle finish, save the last CI-verified swarm stack in git history for reference.

## Alternatives considered

- **Keep Docker Swarm on Contabo.** Rejected: the reasons for ADR-0026 have thinned. Fewer apps to host + Supabase carrying the persistent backend + one lead engineer's time all point the other way. Sunk cost on the Swarm work is real but not a reason to keep paying the ongoing operational tax.
- **Railway / Fly.io.** Considered. Both are cheaper than Vercel Pro at scale, both handle Next.js. Rejected because Vercel maintains the Next.js framework — deep runtime features (Server Actions, ISR, middleware) work here first. For a Next.js-heavy app, Vercel is the highest-alignment host.
- **Cloudflare Workers / Pages.** Considered. Attractive for Cloudflare's African edges (better for Cameroonian users). Rejected because Next.js Server Actions and middleware support on Workers is less mature; would need to rewrite the auth flow. Revisit once Cloudflare's Next.js adapter is production-hardened and if latency to Cameroon becomes a real complaint.
- **Static hosting only (Cloudflare Pages + no server component).** Rejected: admin needs Server Actions for RLS-bypassing service-role writes and Supabase Auth session refresh in middleware. Neither works without a server runtime.
- **Vercel single-project-per-app + Preview environment for staging.** Considered as an alternative to the four-project model. Rejected: Preview URLs on Vercel are per-commit random hostnames, and pinning a stable `staging.*` alias requires branch-alias config that's more fiddly than just having a dedicated staging project. Four projects total is more explicit for the same steady-state effort.
