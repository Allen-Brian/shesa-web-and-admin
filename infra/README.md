# Infra

Container + reverse-proxy configuration for Shesa across all three environments. Same Dockerfile, same Caddy, same network topology — only the orchestrator and env vars change.

```
infra/
├── README.md                  ← this file
├── docker/
│   └── Dockerfile.next.dev    parameterized dev image (one file, five apps)
├── caddy/
│   ├── Caddyfile.dev          local vhost routing (*.shesa.test)
│   └── Caddyfile.prod         staging/prod vhost routing (per-app env vars)
├── docker-compose.dev.yml     local Compose stack (auth/web/exco/finance)
└── docker-compose.prod.yml    Swarm stack (added in E14)
```

## The three environments

| Env        | Orchestrator            | Hostnames                                                                              | TLS                                                  |
| ---------- | ----------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| local      | `docker compose`        | `*.shesa.test` via `/etc/hosts`                                                        | none (HTTP); cookies set without `Secure`            |
| staging    | Docker Swarm on Contabo | `staging.shesaconnect.com` + `staging-{auth,exco,finance}.shesaconnect.com` (siblings) | Cloudflare proxy + Caddy origin cert (Let's Encrypt) |
| production | Docker Swarm on Contabo | `shesaconnect.com` + `{auth,exco,finance}.shesaconnect.com` (apex + subdomains)        | Cloudflare Full Strict + Caddy origin cert           |

## One Dockerfile, every app

Rather than per-app `Dockerfile.dev` wrappers that all duplicate the same Node + pnpm setup, `infra/docker/Dockerfile.next.dev` takes `APP_DIR` + `APP_PORT` build args and runs the right app's `pnpm dev` (Next.js for `web` / `auth`; Vite for `exco` / `finance`). Each app's service in `docker-compose.dev.yml` passes its own values:

```yaml
auth:
  build:
    context: ..
    dockerfile: infra/docker/Dockerfile.next.dev
    args:
      APP_DIR: auth
      APP_PORT: 3001
```

The Dockerfile filename keeps the `.next.dev` suffix for legacy reasons; it's framework-agnostic — `pnpm --filter @shesa/<app> dev` invokes whichever toolchain that package defines.

## Local dev setup

1. **Add `*.shesa.test` to `/etc/hosts`** so the browser resolves Shesa subdomains to localhost. Without this, cross-subdomain auth cookies don't work — browsers refuse `domain=.localhost` cookies.

   ```
   127.0.0.1 web.shesa.test auth.shesa.test exco.shesa.test finance.shesa.test connect.shesa.test
   ```

2. **Start Supabase locally** — `pnpm db:start`. This runs Supabase's own Docker stack (managed by the Supabase CLI) on a separate set of containers. Exposes Postgres on `:54322`, the data API on `:54321`, Studio on `:54323`.

3. **Generate `.env.local`** — `pnpm env:init`. Captures Supabase keys + writes per-app URLs.

4. **Start the apps** — `docker compose -f infra/docker-compose.dev.yml up --build`.
   - First run: builds the dev image (~30s warm, ~3min cold), `pnpm install` inside the container, then `pnpm dev` starts.
   - Subsequent runs: skip the image build; pnpm install uses the cached `shesa-pnpm-store` volume.

5. **Open the app** — `http://auth.shesa.test`. Caddy on `:80` reverse-proxies to the `auth` container's `:3001`.

## Inside-container vs in-browser networking

`docker-compose.dev.yml` overrides server-side env vars so containers can reach the Supabase CLI (which runs on the host, not in this compose network):

| Var                        | Browser sees      | Container sees                                                            |
| -------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` | `127.0.0.1:54321` | (irrelevant — inlined into browser bundle)                                |
| `SUPABASE_URL`             | —                 | `host.docker.internal:54321` (compose override; .env.local has 127.0.0.1) |
| `SUPABASE_DB_URL`          | —                 | `host.docker.internal:54322` (compose override; .env.local has 127.0.0.1) |

`host.docker.internal` is provided automatically by Docker Desktop on macOS/Windows; the Linux build relies on the `extra_hosts: ["host.docker.internal:host-gateway"]` mapping the compose file declares per service.

## Why dockerize local too

Catching "works on my machine, breaks in prod" bugs at first dev commit instead of first deploy. Same Dockerfile, same Caddy, same network topology — only the orchestrator differs.

The cost is real (slower iteration vs native `pnpm dev`, more moving parts to manage). It pays back the first time staging breaks for a reason that would have manifested locally if local were also dockerized.

## Staging + production (E14)

`docker-compose.prod.yml` will define a Docker Swarm stack (`docker stack deploy …`) with:

- One service per Shesa app (`web`, `auth`, `exco`, `finance`, `connect`)
- Caddy as the ingress (single-replica, host-mode networking, automatic HTTPS via Let's Encrypt)
- Cloudflare in front (Full Strict TLS, CDN, DDoS shield)
- Native Docker Swarm secrets for everything sensitive (no env-var leaks)

The Swarm stack is one VPS per environment (staging, production) per ADR-0026.
