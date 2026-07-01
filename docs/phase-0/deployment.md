# Deployment

Two environments, one VPS each (per ADR-0026), one auto-deploy pipeline per branch.

- Merge to `develop` → staging deploys automatically
- Merge to `master` → production deploys after a **manual approval** click

## Overview

```
push develop
    │
    ▼
CI  ─────────┐   (lint + typecheck + test + build)
             │       │
DB test ─────┤       ▼
             │  workflow_run(both) ─── gate ─── migrate ─── deploy
             │                                     │           │
             │                            supabase       docker
             │                            db push        stack deploy
             │                            (staging)      (staging VPS)
             ▼
      ── same for master → production ──
```

The gate job in each deploy workflow uses `github-script` to check that BOTH `CI` and `DB test (pgTAP)` succeeded at the current head SHA before allowing `migrate` + `deploy` to run. This handles the workflow_run ordering: `CI` finishing first triggers the deploy workflow, but the gate skips it until `DB test` also lands green.

## Required GitHub secrets

**Settings → Environments → staging** (repeat for `production` with per-env values):

| Secret                  | Where to get it                                  |
| ----------------------- | ------------------------------------------------ |
| `SSH_HOST`              | Contabo VPS IP or DNS                            |
| `SSH_USER`              | dedicated deploy user with `docker` group        |
| `SSH_PRIVATE_KEY`       | key matching `~/.ssh/authorized_keys` on the VPS |
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens    |
| `SUPABASE_DB_PASSWORD`  | project's Postgres password                      |

And non-secret **Variables**:

| Variable               | Staging value                       | Production value           |
| ---------------------- | ----------------------------------- | -------------------------- |
| `SUPABASE_PROJECT_REF` | staging project ref                 | production project ref     |
| `APP_BASE_DOMAIN`      | `shesaconnect.com`                  | `shesaconnect.com`         |
| `WEB_DOMAIN`           | `staging.shesaconnect.com`          | `shesaconnect.com`         |
| `AUTH_DOMAIN`          | `staging-auth.shesaconnect.com`     | `auth.shesaconnect.com`    |
| `EXCO_DOMAIN`          | `staging-exco.shesaconnect.com`     | `exco.shesaconnect.com`    |
| `FINANCE_DOMAIN`       | `staging-finance.shesaconnect.com`  | `finance.shesaconnect.com` |
| `LETSENCRYPT_EMAIL`    | inbox that gets ACME expiry notices | same                       |

The `production` environment ALSO needs a **Deployment protection rule** with required reviewers (Settings → Environments → production → Deployment protection rules) so `migrate` + `deploy` both wait for a human click before running.

## Per-VPS runbook

Once per staging + production:

1. **Docker Swarm init:**
   ```
   curl -fsSL https://get.docker.com | sh
   docker swarm init
   ```
2. **Six swarm secrets** — see [../../infra/swarm/secrets.md](../../infra/swarm/secrets.md).
3. **DNS + Cloudflare** — see [../../infra/swarm/dns.md](../../infra/swarm/dns.md).
4. **Clone the repo to `/opt/shesa`:** the deploy workflow `git fetch origin <branch>` + `git reset --hard` before running `docker stack deploy`.

## Deploy artifacts

Each service is a per-app image on `ghcr.io/<owner>/shesa-<app>:staging` / `...:production`, plus a SHA-tagged variant for rollback (`shesa-auth:staging-abc1234`). See `infra/docker/Dockerfile.next.prod` (auth + web) and `infra/docker/Dockerfile.vite.prod` (exco + finance).

The swarm compose file `infra/swarm/docker-compose.prod.yml` is checked in — it's the exact stack definition both environments deploy.

## Rollback

Fastest path: change the image tag in `docker-compose.prod.yml` to a prior SHA and re-run `docker stack deploy` from the VPS:

```
SHESA_IMAGE_TAG=staging-<old_sha> docker stack deploy -c infra/swarm/docker-compose.prod.yml shesa
```

If the migration is the problem, roll forward: write the reverse migration, ship as a normal PR (see [migrations.md](migrations.md) — Postgres migrations don't reverse in place).
