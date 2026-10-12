# Infra & DevOps (standard)

> **Standard** — living convention for hosting, deployment, and operations.
> **Related ADRs:** [0016](../adr/0016-everything-in-frankfurt.md), [0018](../adr/0018-self-hosted-redis-on-api-droplet.md), [0020](../adr/0020-cross-border-data-compliance.md), [0021](../adr/0021-monorepo-pnpm-turborepo.md), [0026](../adr/0026-docker-swarm-for-staging-prod.md), [0030](../adr/0030-supabase-as-baas-with-server-actions.md), [0032](../adr/0032-hybrid-background-jobs.md).

Locked decisions for hosting, deployment, and operations. **Managed everything, boring and reliable, cost-controlled.**

---

## 1. Stack summary

| Layer                       | Choice                                                                                                 | Region                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| Database                    | Supabase (managed Postgres)                                                                            | Frankfurt `eu-central-1`  |
| Authentication              | Supabase Auth                                                                                          | Frankfurt                 |
| Object storage / media      | Supabase Storage                                                                                       | Frankfurt                 |
| Edge Functions              | Supabase Edge Functions (Deno)                                                                         | Global (Supabase-managed) |
| Compute (Next.js apps)      | Contabo VPS + Docker Swarm                                                                             | Germany (Frankfurt-area)  |
| Background queue (later)    | Self-hosted Redis on the Contabo VPS — see [ADR-0018](../adr/0018-self-hosted-redis-on-api-droplet.md) | Germany                   |
| CDN / DNS / TLS edge / DDoS | Cloudflare                                                                                             | Global (African edge)     |
| Source / CI                 | GitHub + GitHub Actions + GitHub Container Registry                                                    | —                         |
| Errors                      | Sentry (frontend + server)                                                                             | —                         |
| Logs / uptime               | One free log tier + uptime monitor                                                                     | —                         |

**Co-location rule:** Supabase + the Contabo VPS both in the Frankfurt area so the Server Action → Postgres hop is local. Cross-region placement is forbidden. See [ADR-0016](../adr/0016-everything-in-frankfurt.md).

---

## 1.1 Note — the Phase 0 spec's Vercel mention is overridden

The Phase 0 spec (`docs/phase-0/spec.md` §2.10) mentions deploying frontend apps to Vercel. **That sentence is overridden.** Shesa frontends ship as Docker images to the Contabo VPS via Docker Swarm per [ADR-0026](../adr/0026-docker-swarm-for-staging-prod.md). The deployment table above is authoritative; any later spec / doc / PR that re-introduces Vercel as the frontend host should cite a _new_ superseding ADR before being merged.

The decision rationale (taken during the Phase 0 planning session): keeping all compute on one Contabo VPS preserves a single billing line, a single set of Docker Swarm secrets, and the latency story for the future Tier B worker container (see [ADR-0032](../adr/0032-hybrid-background-jobs.md)) — splitting frontends onto Vercel would fragment all three for limited upside given Cloudflare already handles edge caching for static assets.

---

## 2. Supabase usage

- **Managed cloud (`cloud.supabase.com`).** No self-hosted Supabase.
- Local + staging stay on the **free tier indefinitely**. Production starts on free and upgrades to Pro when data volume / load justifies it.
- **Free tier caveat:** Free Supabase projects pause after ~7 days of inactivity and have no backups. Production must be Pro before launch.
- Schema changes flow dev → staging → prod via versioned SQL migrations (`supabase migration …`). No manual DB edits.
- Staging mirrors prod config; seed it with realistic (non-personal) data.

---

## 3. Environments

| Env     | Database                      | Compute                        | Notes                                          |
| ------- | ----------------------------- | ------------------------------ | ---------------------------------------------- |
| local   | Supabase CLI (Docker)         | `pnpm dev` for each app        | Free; mirrors prod schema                      |
| staging | Supabase project (free tier)  | Staging Contabo VPS (small)    | Free Supabase + cheapest Contabo plan          |
| prod    | Supabase Pro (when justified) | Prod Contabo VPS (right-sized) | Pro for daily backups, no pausing, PITR add-on |

Local: Supabase CLI brings up a full Supabase stack (Postgres, GoTrue, Storage, Realtime, Edge Function runtime) in Docker. Apps run with `pnpm dev`.

---

## 4. Compute on Contabo

- **One Contabo VPS per environment** (staging + prod), in Germany.
- **Docker Swarm** on each VPS — see [ADR-0026](../adr/0026-docker-swarm-for-staging-prod.md).
- **Caddy** as a Swarm service for automatic HTTPS and as reverse proxy in front of the app containers.
- **Cloudflare** in front of Caddy for CDN, TLS termination at the edge, DDoS, and African-edge caching.
- Each Shesa app (`web`, `exco`, `finance`, `connect`) is its own Swarm service — same compose stack, different image and replica count.
- **Future Tier B worker container** (when background jobs outgrow Edge Functions — see [ADR-0032](../adr/0032-hybrid-background-jobs.md)) joins as another Swarm service alongside Redis.

---

## 5. CI / CD — GitHub Actions

### Branch & deploy flow

```
feature/*  --PR-->  develop  --(auto)-->     STAGING (Contabo)
develop    --PR-->  master   --(manual approval)-->  PRODUCTION (Contabo)
```

- Only `develop` may open a PR into `master`. Both protected.
- Every PR pipeline must be green to merge.

### Pipeline stages (monorepo, pnpm + Turborepo — affected-only)

`install → lint → typecheck → test → build → deploy`

- Build a Docker image per app in CI — push to **GitHub Container Registry** (`ghcr.io/<org>/shesa-<app>`).
- Deploy job SSHes to the Swarm manager and runs `docker stack deploy -c docker-compose.prod.yml --with-registry-auth shesa`.
- **Production deploy is a manual-approval job** (deliberate button press in the GitHub Actions UI).
- Secrets: **GitHub Actions encrypted secrets** (repo + environment-scoped). Never in the repo.
- Use **GitHub Environments** to track deploys and enable one-click rollback (`docker service update --rollback`).
- **Supabase migrations** run before the app deploy (or in a pre-deploy job): `supabase db push --linked` against the target environment.

---

## 6. Background jobs

See [ADR-0032](../adr/0032-hybrid-background-jobs.md).

**Tier A (now):** Supabase pg_cron + Edge Functions for webhooks, daily tasks, single sends.

**Tier B (later, when a job needs it):** Node worker container on the Contabo VPS with BullMQ + Redis ([ADR-0018](../adr/0018-self-hosted-redis-on-api-droplet.md)).

---

## 7. Storage & media

- Member photos, CMS images, attachments in **Supabase Storage**.
- **Cloudflare CDN** in front so images serve from the African edge, not Frankfurt origin.
- Apply the frontend image pipeline (resize, WebP / AVIF, responsive `srcset`, lazy-load) — heaviest payload on metered 3G.

---

## 8. Observability

| Concern               | Tool                                         | Cost      |
| --------------------- | -------------------------------------------- | --------- |
| Errors (FE + server)  | Sentry                                       | Free tier |
| Logs                  | One free log tier (Better Stack / Axiom)     | Free tier |
| Uptime                | Uptime monitor pinging `/api/health` per app | Free tier |
| Health checks         | `/api/health` on each app                    | —         |
| DB performance / logs | Supabase dashboard                           | Included  |
| Host metrics          | Contabo VPS dashboards + alerts              | Included  |

- Propagate `traceId` (UUID) from the client through Server Actions / Edge Functions into logs and Sentry for end-to-end tracing.
- Full metrics / distributed tracing (Prometheus / Grafana / OpenTelemetry) deferred until traffic justifies the cost and ops.

---

## 9. Backups & disaster recovery

- **Supabase Pro daily backups** + Point-in-Time Recovery add-on on production (once Pro).
- Belt-and-suspenders: a scheduled `pg_dump` from a CI workflow to S3-compatible storage, so a backup exists outside Supabase.
- **Test restores quarterly** — an untested backup is not a backup.
- RPO ≤ 24h (daily) / minutes (PITR), RTO ≤ a few hours.

---

## 10. Security & compliance

- **Cross-border transfer:** Cameroonian personal data in the EU requires the Personal Data Protection Authority's authorization + safeguards (Law No. 2024/017). **Action item with an owner and a deadline already passed** — see [ADR-0020](../adr/0020-cross-border-data-compliance.md).
- Sign **GDPR Data Processing Agreements** with Supabase and Contabo.
- TLS in transit everywhere; encryption at rest (Supabase default).
- Secrets in GitHub Actions encrypted secrets + Docker Swarm secrets — never in the repo or images.
- Register with the Authority before processing; have a breach-notification process.
- **Residency vs sovereignty:** Supabase is US-incorporated, Contabo is German. Frankfurt solves residency; sovereignty mixed. Revisit for sensitive financial data.

---

## 11. Approximate monthly cost (early production)

| Item                              | Approx USD / mo                  |
| --------------------------------- | -------------------------------- |
| Supabase Pro (prod)               | $25–35 (later — free at launch)  |
| Contabo VPS prod + staging        | $10–20 (cheapest plans cover it) |
| Cloudflare                        | $0                               |
| Sentry / logs / uptime            | $0 (free tiers)                  |
| Object storage (Supabase Storage) | ~$0–5                            |
| **Total**                         | **~$10–60 / mo (~6k–35k FCFA)**  |

Well within the Cameroonian early-stage budget envelope.

---

## 12. Authentication (decision)

See [ADR-0019](../adr/0019-supabase-auth-nestjs-authorization.md). Supabase Auth = authentication; RLS + policy module = authorization.

**Market-risk action — validate early:** confirm Supabase phone OTP delivers to MTN and Orange Cameroon numbers through Supabase's supported SMS providers. Cross-border SMS to Cameroonian carriers is a common point of OTP failure. Fallback if deliverability is poor: email OTP, magic link, or a WhatsApp / local-aggregator (Termii) OTP path via an Edge Function. Test with real SIMs before committing the login flow.
