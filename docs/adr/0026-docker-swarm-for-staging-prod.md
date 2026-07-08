# 0026 — Docker Swarm for staging and production orchestration

- **Status:** superseded by [ADR-0042](0042-vercel-plus-supabase-hosting.md) (2026-07-08)
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

The infra ADRs locked the runtime targets: Supabase Cloud (managed) for the database / auth / storage, plus a **Contabo VPS** for hosting the Next.js apps (and, later, a Node worker container for heavy background jobs — see [ADR-0018](0018-self-hosted-redis-on-api-droplet.md)). What remained open was the **orchestration layer** on the VPS: how containers start, get replaced, get rolled back, and how secrets reach them.

Plain `docker compose up` on a VPS works for local dev but isn't a deploy strategy: no rolling updates, no graceful replace, no native secret mounting. Bringing in Kubernetes is overkill for a single-VPS failure domain at this team size. The middle ground is **Docker Swarm** — built into Docker, no extra runtime cost, native rolling updates, native secrets.

## Decision

**Staging and production run on Docker Swarm on the Contabo VPS.** Local dev stays plain Docker Compose.

- **Two compose files** in `infra/`:
  - `docker-compose.yml` — local dev (bridge networks, build context, `.env`).
  - `docker-compose.prod.yml` — Swarm stack file (overlay networks, `deploy:` blocks, native `secrets:`, `image:` from GitHub Container Registry).
- **Single-manager Swarm per environment** — one Contabo VPS in staging, one in production. Worker nodes added later if the apps horizontally scale.
- **Rolling-update config per service** (`deploy.update_config`): `parallelism: 1`, `delay: 10s`, `order: start-first`, `failure_action: rollback`, `monitor: 30s`. Combined with `stop_grace_period: 30s` and a `/api/health` healthcheck, this gives Swarm-native zero-downtime cutover.
- **Native Docker Swarm secrets** for prod credentials (`supabase_service_role_key`, `supabase_jwt_secret`, `cookie_secret`, `cloudflare_api_token`, MTN/Orange API keys, etc.). Created out-of-band on the manager (`docker secret create <name> -`); compose declares them under `secrets:` and mounts them at `/run/secrets/<name>`. The Next.js apps read via a `*_FILE` env loader. **No secrets in the image, env vars, or the registry.**
- **Caddy** lives inside the stack as a single-replica service publishing 80/443 in `mode: host` for automatic HTTPS. **Cloudflare** stays in front for CDN, TLS termination at the edge, DDoS protection, and African-edge caching.
- **Each Shesa app is its own Swarm service** (`web`, `exco`, `finance`, `connect`) — same `docker-compose.prod.yml`, different `image:` and `deploy:` blocks. Scale via `deploy.replicas: N` per app.
- **Future Node worker** (when background jobs outgrow Supabase Edge Functions — see [ADR-0018](0018-self-hosted-redis-on-api-droplet.md)) is added as its own Swarm service alongside the apps, with Redis as a sibling service.
- **Deploy mechanism in CI:** `docker stack deploy -c docker-compose.prod.yml --with-registry-auth shesa` over SSH to the manager, triggered from GitHub Actions.
- **Rollback** is `docker service update --rollback <service>` or redeploying with a prior `IMAGE_TAG`.

Setup recipes, secret-creation commands, and deploy/rollback details live in [`infra/swarm/README.md`](../../infra/swarm/README.md) (added in Phase 0).

## Consequences

- Native zero-downtime rolling updates without a third-party deploy tool.
- Secrets are physically separate from images and env vars — defense-in-depth against `docker inspect` leaks and registry compromise.
- Going multi-VPS later is mechanical: `docker swarm join` + add `deploy.replicas` + `placement.constraints` for stateful services.
- Operational discipline (`docker swarm init`, `docker secret create`, `docker stack deploy`) is documented per-env in `infra/swarm/README.md`; humans run it once per environment.
- Contabo VPS gives much better price/performance than DigitalOcean for the same specs — same Docker Swarm pattern works identically.

## Alternatives considered

- **Plain Docker Compose on the VPS** — rejected: no rolling updates, no native secrets, replacing containers means downtime.
- **`docker rollout`** — workable on a single node, but doesn't give native secrets or future multi-node growth without re-tooling. Swarm covers both for the same effort.
- **Kubernetes (k3s, k0s)** — rejected: ops burden too high for a single-VPS failure domain. Revisit only if scale forces multi-node apps and we need richer scheduling.
- **Nomad** — considered: comparable to Swarm in simplicity, but extra runtime to install and learn. Swarm ships in Docker; zero new components.
- **Vercel / Netlify / Cloudflare Pages** for the Next.js apps — considered: simplest deploy story, but locks us to a vendor and complicates secret sharing with the future worker container. The Contabo + Swarm choice keeps all compute on one machine, one stack, one billing line.
