# Infra

Container + reverse-proxy configuration for Shesa across all three environments. Same Dockerfiles in local / staging / production — only the orchestrator and the env vars change.

```
infra/
├── README.md                  ← this file
├── docker/
│   └── Dockerfile.next.dev    base dev image (hot reload via volume mount)
├── caddy/
│   ├── Caddyfile.dev          local vhost routing (*.shesa.test)
│   └── Caddyfile.prod         staging/prod vhost routing (*.shesa.org)
├── docker-compose.dev.yml     local Compose stack (added in E9)
└── docker-compose.prod.yml    Swarm stack (added in E14)
```

## The three environments

| Env        | Orchestrator            | Hostnames                       | TLS                                                  |
| ---------- | ----------------------- | ------------------------------- | ---------------------------------------------------- |
| local      | `docker compose`        | `*.shesa.test` via `/etc/hosts` | none (HTTP); cookies set without `Secure`            |
| staging    | Docker Swarm on Contabo | `*.staging.shesa.org`           | Cloudflare proxy + Caddy origin cert (Let's Encrypt) |
| production | Docker Swarm on Contabo | `*.shesa.org`                   | Cloudflare Full Strict + Caddy origin cert           |

Same `Dockerfile.next` builds the production image used in both staging and prod; `Dockerfile.next.dev` is the hot-reload variant for local.

## Local dev setup (apps land in E9/E10)

1. **Add `*.shesa.test` to `/etc/hosts`** so the browser resolves Shesa subdomains to localhost. Without this, cross-subdomain auth cookies don't work — browsers refuse `domain=.localhost` cookies.

   ```
   127.0.0.1 web.shesa.test auth.shesa.test exco.shesa.test finance.shesa.test connect.shesa.test
   ```

2. **Start Supabase locally** — `pnpm db:start`. This runs Supabase's own Docker stack (managed by the Supabase CLI). It exposes Postgres on `:54322`, the data API on `:54321`, and Studio on `:54323`.

3. **Generate `.env.local`** — `pnpm env:init`. Captures Supabase keys + writes per-app URLs.

4. **Start the apps** — `docker compose -f infra/docker-compose.dev.yml up` (once that file exists in E9). Hot reload via bind-mounted source.

5. **Caddy routes** `auth.shesa.test:80` → `auth-container:3001`, etc. (see `caddy/Caddyfile.dev`).

## Why dockerize local too

Catching "works on my machine, breaks in prod" bugs at first dev commit instead of first deploy. Same image, same Caddy, same network topology — only the orchestrator differs.

The cost is real (slower iteration vs native `pnpm dev`, more moving parts to manage). It pays back the first time staging breaks for a reason that would have manifested locally if local were also dockerized.

## Staging + production (E14)

`docker-compose.prod.yml` will define a Docker Swarm stack (`docker stack deploy …`) with:

- One service per Shesa app (`web`, `auth`, `exco`, `finance`, `connect`)
- Caddy as the ingress (single-replica, host-mode networking, automatic HTTPS via Let's Encrypt)
- Cloudflare in front (Full Strict TLS, CDN, DDoS shield)
- Native Docker Swarm secrets for everything sensitive (no env-var leaks)

The Swarm stack is one VPS per environment (staging, production) per ADR-0026.
