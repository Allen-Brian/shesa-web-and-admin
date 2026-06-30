# Local dev setup

How to take a fresh machine to a running Shesa stack. Follow once per machine; the daily workflow at the bottom is what you run every day after.

---

## Prerequisites — install once per machine

| Tool              | Why                                      | Install (macOS)                            |
| ----------------- | ---------------------------------------- | ------------------------------------------ |
| Node 22+          | The runtime                              | `brew install node` (or `nvm install 22`)  |
| pnpm 9.15+        | Package manager (auto via corepack)      | comes with Node 22; just `corepack enable` |
| Docker            | Runs the Supabase stack locally          | https://docker.com/products/docker-desktop |
| Git               | Cloning + commits                        | `brew install git`                         |
| GitHub CLI (`gh`) | Auditing staging/prod secrets (optional) | `brew install gh` then `gh auth login`     |

Verify each:

```bash
node --version    # v22.x.x
corepack --version
docker --version
git --version
```

---

## One-time setup

### 1. Clone + install

```bash
git clone git@github.com:Evar-SF27/Shesa-App.git
cd "Shesa-App"
corepack enable                  # honors the project's pnpm@9.15.0 pin
pnpm install                     # ~30s (uses pnpm's content-addressable store)
```

If `corepack enable` complains about an existing yarn pin in `~/package.json`, the project-level `packageManager` field overrides it for this repo — install should proceed normally.

### 2. Add `/etc/hosts` entries

Cross-subdomain auth cookies (the whole "log in once on auth.shesa.test, stay logged in everywhere" story) only work when the browser resolves Shesa subdomains as distinct hosts. Browsers refuse to set `domain=.localhost` cookies — so we use a `*.shesa.test` pattern locally.

Add this block to `/etc/hosts` (requires `sudo`):

```
# Shesa local dev
127.0.0.1 web.shesa.test
127.0.0.1 auth.shesa.test
127.0.0.1 exco.shesa.test
127.0.0.1 finance.shesa.test
127.0.0.1 connect.shesa.test
```

Verify: `ping -c 1 auth.shesa.test` should respond from `127.0.0.1`.

### 3. Boot Supabase locally (first time = slow)

```bash
pnpm db:start
```

First run pulls ~2 GB of Docker images (Postgres, GoTrue, Storage, Realtime, Studio, Mailpit, postgres-meta). Plan for ~5–10 min depending on bandwidth. Subsequent boots take seconds — the images are cached on your machine.

If the pull times out (we've hit transient Docker Hub rate limits), wait a minute and retry — the CLI resumes where it left off.

### 4. Generate `.env.local`

```bash
pnpm env:init
```

This writes `.env.local` (mode `0600`, gitignored) with sensible defaults and captures the Supabase keys from `pnpm db:status` automatically. The output lists any vars left as placeholders (typically `RESEND_API_KEY` if you don't have a Resend sandbox key yet — fine to leave blank in local dev; SMS_PROVIDER_MODE=stub keeps email and SMS silent).

To audit:

```bash
pnpm env:check
```

### 5. Generate Supabase TypeScript types

```bash
pnpm db:types
```

Writes `packages/supabase/src/types.gen.ts` from the live schema. Re-run after every migration.

---

## Daily workflow

```bash
pnpm db:start         # boot Supabase (fast after the first time)
pnpm dev              # boot the apps via Turborepo (apps land in E9/E10; today this is a no-op)
pnpm dev:open         # open every running URL in the default browser
```

`pnpm dev:open` is the "one command for everything" — probes each known URL, opens only the ones that respond. Today (post-E2, pre-E9) that's Supabase Studio + Mailpit. As apps ship, their URLs auto-add (edit `scripts/dev-open.mjs` per the inline TODO in the URLS array).

### What `pnpm dev:open` opens

| Service                       | URL                            | Available after |
| ----------------------------- | ------------------------------ | --------------- |
| Supabase Studio (DB GUI)      | http://127.0.0.1:54323         | `pnpm db:start` |
| Mailpit (local email catcher) | http://127.0.0.1:54324         | `pnpm db:start` |
| Shesa Auth                    | http://auth.shesa.test:3001    | E9 lands        |
| Shesa Web                     | http://web.shesa.test:3000     | E10 lands       |
| Shesa Exco                    | http://exco.shesa.test:3002    | E10 lands       |
| Shesa Finance                 | http://finance.shesa.test:3003 | E10 lands       |
| Shesa Connect                 | http://connect.shesa.test:3004 | E10 lands       |

Supabase API URL (`http://127.0.0.1:54321`) is checked for reachability but not opened — it's an API surface, not a browsable page.

### When you're done for the day

```bash
pnpm db:stop          # stops the Supabase containers; data persists in a Docker volume
```

You don't need to stop — leaving Docker running uses ~1.5 GB of memory but is otherwise harmless. `pnpm db:start` again the next day picks up where you left off.

---

## Common operations

### Add a new migration

```bash
pnpm db:migrate:new <descriptive_name>   # creates supabase/migrations/<timestamp>_<name>.sql
```

Edit the file, then:

```bash
pnpm db:migrate         # apply pending migrations (no data loss)
pnpm db:types           # regenerate TS types
# OR
pnpm db:reset           # WIPE + apply all + re-seed (use for dev iteration)
pnpm db:types
```

### Reset the local DB

```bash
pnpm db:reset
```

Drops every table, re-applies every migration, re-runs `seed.sql`. Local-only — safe to run as often as you want.

### Add shared test data

Edit `supabase/seed.sql`. Use stable UUIDs + `ON CONFLICT DO NOTHING` so re-running is idempotent. Commit. Every dev's next `db:reset` and staging's next deploy picks it up.

### Inspect the database directly

```bash
docker exec -it supabase_db_Shesa_App psql -U postgres -d postgres
```

(Or use Supabase Studio at http://127.0.0.1:54323 — easier for browsing.)

### Stop everything

```bash
pnpm db:stop
docker system prune -f             # optional: reclaim disk if you don't plan to dev for a while
```

---

## Troubleshooting

### "Docker is not running"

Open Docker Desktop and wait for the whale icon to stop animating. Then re-run.

### "failed to pull docker image" / TLS timeout

Transient registry issues (Docker Hub, ECR, GHCR). Wait a minute and retry `pnpm db:start`. If persistent, check `docker info` and your network. On corporate networks, ensure Docker is allowed to reach `registry-1.docker.io`, `public.ecr.aws`, and `ghcr.io`.

### Port already in use (54321 / 54322 / 54323 / 54324)

Another Supabase project is running. List them: `docker ps | grep supabase_`. Stop the conflicting one with `docker stop <container>`, or rename our project in `supabase/config.toml` (`project_id`).

### `auth.shesa.test` doesn't resolve / cookies don't share

Did you add the `/etc/hosts` block in step 2? `ping -c 1 auth.shesa.test` should reply from `127.0.0.1`. If not, `sudo dscacheutil -flushcache` (macOS) to flush DNS cache.

### `pnpm db:types` overwrites the file with empty content

Make sure local Supabase is running first (`pnpm db:start` then `pnpm db:status` should print a JSON with `API_URL`). The CLI silently writes an empty file when the local stack isn't up — known footgun.

### `supabase functions serve` returns 503 "name resolution failed"

Symptom: `pnpm supabase functions serve` runs but every request to `http://127.0.0.1:54321/functions/v1/<name>` returns `HTTP 503` with body `{"message":"name resolution failed"}`. `docker ps` shows no `supabase_edge_runtime_*` container.

Cause: the Supabase CLI's edge-runtime container failed to start (silent during `serve` startup). Usually a Docker DNS issue or a stuck image pull. Kong (the API gateway) is up, accepts the request, can't reach the missing upstream → "name resolution failed" comes back to the caller.

Fixes, in order of likelihood:

```bash
# 1. Restart Docker Desktop (fixes most macOS DNS flakes)
pnpm db:stop
# (right-click Docker menubar icon → Restart, wait for whale to settle)
pnpm db:start

# 2. Pre-pull the edge runtime image manually
docker pull public.ecr.aws/supabase/edge-runtime:v1.69.1   # version varies — match the CLI version

# 3. Verify the runtime can resolve npm registry from inside Docker
docker run --rm alpine nslookup registry.npmjs.org

# 4. If on a corporate network / VPN: confirm Docker is allowed
#    to reach registry-1.docker.io and registry.npmjs.org.
```

The function code is unaffected by this — Edge Functions deployed to Supabase Cloud (and CI's ephemeral runners) work without this local hiccup. Use the cloud-deployed staging environment for end-to-end verification while the local issue is being resolved.

### Cookies set in dev but `Secure` flag breaks them

Local cookies are set with `secure: false` (see `packages/supabase/src/cookie-config.ts`) precisely because `*.shesa.test` is HTTP. If you ever see "Secure" cookie warnings locally, check `APP_ENV` in `.env.local` is `local` — the cookie-config branches on it.

---

## What "working" looks like after setup

A successful first-run leaves you with:

- Supabase Studio open at http://127.0.0.1:54323 — you can see the `core` schema with `scopes`, `scope_capabilities`, `profiles`
- `core.scopes` contains the seeded Mainstream + Shesa Buea Branch rows
- Mailpit open at http://127.0.0.1:54324 — empty inbox (no emails yet; auth lands in E9)
- `pnpm typecheck` passes (5/5 packages green)

Once apps ship in E9/E10, `pnpm dev:open` will additionally open each app's URL — log in once on `auth.shesa.test`, navigate to `finance.shesa.test`, you're already logged in.

---

## Related

- [`supabase/README.md`](../../supabase/README.md) — DB workflow + branch→env promotion model
- [`infra/README.md`](../../infra/README.md) — Docker/Caddy architecture for local + staging + prod
- [`docs/standards/git-conventions.md`](../standards/git-conventions.md) — commit format + branch naming
- [`docs/adr/0007-tenancy-model-orgs-and-grants.md`](../adr/0007-tenancy-model-orgs-and-grants.md) — what's in the `core.scopes` table you're now looking at in Studio
