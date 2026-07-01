# Local dev setup

How to take a fresh machine to a running Shesa stack.

The setup is in three parts. **Part 1 (Database) is required for either app mode.** Then pick **Part 2 (Local)** OR **Part 3 (Local Docker)** based on what you're doing:

| You want to…                                       | Use Part…  | Why                                                                                |
| -------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| Iterate on UI or Server Actions fast               | 2 (Local)  | No container overhead; hot reload is instant                                       |
| Debug something that only reproduces in production | 3 (Docker) | Matches staging/prod topology — same Alpine, same networking                       |
| Test cross-subdomain cookies across several apps   | 3 (Docker) | Caddy fronts everything at `*.shesa.test`; browsers treat them as separate origins |

You can switch between Part 2 and Part 3 freely — same code, same `.env.local`, same database. Just don't run both at the same time (they share the app ports).

---

## Prerequisites — install once per machine

| Tool              | Why                                             | Install (macOS)                            |
| ----------------- | ----------------------------------------------- | ------------------------------------------ |
| Node 22+          | The runtime                                     | `brew install node` (or `nvm install 22`)  |
| pnpm 9.15+        | Package manager (auto via corepack)             | ships with Node 22; just `corepack enable` |
| Docker Desktop    | Runs Supabase locally and (optionally) the apps | https://docker.com/products/docker-desktop |
| Git               | Cloning + commits                               | `brew install git`                         |
| GitHub CLI (`gh`) | Auditing staging/prod secrets (optional)        | `brew install gh` then `gh auth login`     |

Verify each:

```bash
node --version    # v22.x.x
corepack --version
docker --version
git --version
```

Clone + install workspace deps:

```bash
git clone git@github.com:Evar-SF27/Shesa-App.git
cd "Shesa-App"
corepack enable                  # honors the project's pnpm@9.15.0 pin
pnpm install                     # ~30 s
```

If `corepack enable` complains about an existing yarn pin in `~/package.json`, the project-level `packageManager` field overrides it for this repo — install proceeds normally.

---

## Part 1 — Database (required)

Supabase runs as its own Docker stack managed by the Supabase CLI, separate from the apps. It exposes Postgres, GoTrue (Auth), Storage, Realtime, Studio, and Mailpit on ports `54321-54324`.

### 1.1. Boot Supabase

```bash
pnpm db:start
```

First run pulls ~2 GB of images. Plan for 5–10 min depending on bandwidth. Subsequent boots take seconds — images cache on your machine.

If the pull times out (transient Docker Hub rate limits), wait a minute and retry. The CLI resumes where it left off.

### 1.2. Apply migrations + seed

```bash
pnpm db:migrate       # apply pending migrations from supabase/migrations/*.sql
```

The seed runs automatically on `db:start` (via `supabase/config.toml`'s `[db.seed]` block). If you need to force a fresh state:

```bash
pnpm db:reset         # drops everything, re-applies migrations, re-runs seed
```

### 1.3. Generate the Supabase types file

```bash
pnpm db:types
```

Writes `packages/supabase/src/types.gen.ts` from the live schema. Re-run after every migration. **Local Supabase must be running** — the CLI silently writes an empty file otherwise (known footgun).

### 1.4. Verify it worked

```bash
pnpm db:status
```

Should print a JSON block with `API_URL`, `DB_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY`. Then browse to:

- **Supabase Studio** — http://127.0.0.1:54323 (GUI over the local DB)
- **Mailpit** — http://127.0.0.1:54324 (catches emails Supabase would have sent)

In Studio you should see the `core`, `audit`, and `notifications` schemas, plus the seeded Mainstream + Shesa Buea Branch rows under `core.scopes`.

### 1.5. Daily database commands

```bash
pnpm db:start                     # boot (fast after first time)
pnpm db:stop                      # stop (data persists in Docker volume)
pnpm db:reset                     # wipe + re-migrate + re-seed
pnpm db:migrate:new <name>        # scaffold a new migration file
pnpm db:migrate                   # apply pending migrations
pnpm db:test                      # run the pgTAP suite
```

You don't need to `db:stop` at end of day — leaving Docker running uses ~1.5 GB of memory but is otherwise harmless.

---

## Part 2 — Local (native apps)

The apps run directly on your macOS Node, no containers. Fastest iteration; hot reload is instant. **Requires Part 1 (Database) running.**

### 2.1. Generate `.env.local`

```bash
pnpm env:init
```

Writes `.env.local` at the repo root (mode `0600`, gitignored) with sensible defaults, captures the Supabase keys from `pnpm db:status`, and symlinks the file into each Next app's directory (`apps/auth/.env.local`, `apps/web/.env.local`) — Next reads env from the app folder, not the workspace root.

The output lists any placeholders. Typically you'll see `RESEND_API_KEY` left blank. For local dev, set it to any non-empty string:

```bash
# Edit .env.local (or via any text editor)
RESEND_API_KEY=placeholder-no-real-email-yet
```

Real Resend key only needed if you're exercising the password-reset email flow.

### 2.2. Add `/etc/hosts` entries (optional but recommended)

Only needed if you want to test cross-subdomain behavior (the shared cookie between apps). Skip if you're just working on one app.

```bash
sudo sh -c 'echo "127.0.0.1 auth.shesa.test web.shesa.test exco.shesa.test finance.shesa.test" >> /etc/hosts'
```

Verify: `ping -c 1 auth.shesa.test` responds from `127.0.0.1`.

Cross-subdomain cookies only work when the browser resolves Shesa subdomains as distinct hosts — browsers refuse `domain=.localhost` cookies. **Without `/etc/hosts` you can still run each app individually at `localhost:<port>`, but the SSO handoff between apps won't demonstrate.**

### 2.3. Start the apps

Everything at once (Turborepo runs each app's `dev` script in parallel):

```bash
pnpm dev
```

Or just one:

```bash
pnpm --filter @shesa/auth dev     # → http://localhost:3001
pnpm --filter @shesa/web dev      # → http://localhost:3000
pnpm --filter @shesa/exco dev     # → http://localhost:3002
pnpm --filter @shesa/finance dev  # → http://localhost:3003
```

### 2.4. Ports

| App     | URL                   | Notes                    |
| ------- | --------------------- | ------------------------ |
| auth    | http://localhost:3001 | Next.js (Server Actions) |
| web     | http://localhost:3000 | Next.js (public site)    |
| exco    | http://localhost:3002 | Vite React SPA           |
| finance | http://localhost:3003 | Vite React SPA           |

With `/etc/hosts` set, replace `localhost` with the app's subdomain (`auth.shesa.test`, etc.) — same ports, but the shared apex cookie now works across them.

### 2.5. Verify

Open http://localhost:3001 — you should see the sign-in card. Log in with a user you seed via Supabase Studio (Studio → Authentication → Users → Add user). DevTools → Application → Cookies should show `sb-*` entries after sign-in.

---

## Part 3 — Local Docker

The apps run in Alpine containers, same shape as staging/production. Slower iteration than Part 2 (first-run install inside container is ~10 min on slow networks), but catches "works on my machine, breaks in prod" issues before they hit deploy. **Requires Part 1 (Database) running.**

### 3.1. `/etc/hosts` (required)

Docker mode reverse-proxies via Caddy at `*.shesa.test:80`, so the hosts entries are non-optional here:

```bash
sudo sh -c 'echo "127.0.0.1 auth.shesa.test web.shesa.test exco.shesa.test finance.shesa.test" >> /etc/hosts'
```

### 3.2. `.env.local` (same as Part 2)

If you haven't already:

```bash
pnpm env:init
```

The compose file overrides `SUPABASE_URL` and `SUPABASE_DB_URL` to `host.docker.internal:*` inside the container (the container can't reach `127.0.0.1` of your host directly), while `NEXT_PUBLIC_SUPABASE_URL` stays at `127.0.0.1:*` for the browser bundle. Next's env loader doesn't clobber existing `process.env`, so the compose override wins — see [`infra/README.md`](../../infra/README.md) for the full networking table.

### 3.3. Start the stack

```bash
pnpm compose:up
```

Under the hood: `docker compose -f infra/docker-compose.dev.yml up --build`.

First run:

- builds the parameterized `Dockerfile.next.dev` image (~30 s once, cached after)
- runs `pnpm install --filter <app>...` inside each container (5–10 min on slow networks; hits the internal named-volume pnpm store on subsequent runs)
- boots `pnpm dev` per app

Subsequent runs skip the image build and re-use the pnpm store, so start-up is 30 s + Next's own boot.

Handy commands:

```bash
pnpm compose:up                                                     # foreground, live logs
docker compose -f infra/docker-compose.dev.yml up -d                # detached
pnpm compose:logs                                                   # follow logs of everything
docker compose -f infra/docker-compose.dev.yml logs -f auth         # one service
pnpm compose:down                                                   # stop + remove containers (volumes persist)
```

### 3.4. Access the apps

Currently — see [`infra/docker-compose.dev.yml`](../../infra/docker-compose.dev.yml) — the auth container publishes port 3001 directly to the host, and Caddy is commented out because pulling `caddy:2-alpine` from Docker Hub has been flaky on our network.

That means, for now:

- **auth** → http://localhost:3001 (or http://auth.shesa.test:3001 if hosts are set)
- **web / exco / finance** — their compose services are wired but Caddy isn't fronting them; open at `localhost:<port>` in the compose configuration once the images build.

When Docker Hub connectivity is reliable, uncomment the `caddy` service in the compose file and the `web.shesa.test:80` / `exco.shesa.test:80` / `finance.shesa.test:80` blocks in `infra/caddy/Caddyfile.dev`. From that point on you hit `http://<app>.shesa.test` (no port) and Caddy routes to the right container.

### 3.5. Verify

Same as Part 2 §2.5 — open the auth URL, log in, check cookies. With Caddy on, the cookie's `Domain` should be `.shesa.test` (readable from any subdomain).

---

## Common operations (either mode)

### Add a migration

```bash
pnpm db:migrate:new <descriptive_name>
# → supabase/migrations/<timestamp>_<name>.sql
```

Edit the file, then:

```bash
pnpm db:migrate          # apply forward (no data loss)
pnpm db:types            # regenerate TS types
```

For iterative development, `pnpm db:reset` is safer — it starts clean.

### Add shared test data

Edit `supabase/seed.sql`. Use stable UUIDs + `ON CONFLICT DO NOTHING` so re-running is idempotent. Commit. Every dev's next `db:reset` and every deploy picks it up.

### Inspect the database directly

```bash
docker exec -it supabase_db_Shesa_App psql -U postgres -d postgres
```

(Or use Supabase Studio — easier for browsing.)

### Run the tests

```bash
pnpm test                # unit + component (Vitest + RTL, ~700 ms)
pnpm test:db             # pgTAP suite (needs local Supabase running)
pnpm test:e2e:install    # download Chromium (~180 MB, one time)
pnpm test:e2e            # Playwright login smoke
```

### Stop everything

```bash
pnpm compose:down        # if you used Part 3
pnpm db:stop             # stops Supabase
docker system prune -f   # optional: reclaim disk if you're taking a break
```

---

## Troubleshooting

### Database

**"Docker is not running"** — Open Docker Desktop and wait for the whale icon to stop animating.

**"failed to pull docker image" / TLS timeout** — Docker Hub is flaky, especially from Cameroon. Wait a minute and retry `pnpm db:start`. Persistent? Configure a mirror in Docker Desktop → Settings → Docker Engine:

```json
"registry-mirrors": ["https://mirror.gcr.io"]
```

**Port already in use (54321 / 54322 / 54323 / 54324)** — Another Supabase project is running. `docker ps | grep supabase_`, then `docker stop <container>`.

**`pnpm db:types` produces an empty file** — Local Supabase wasn't running. `pnpm db:start` first, verify with `pnpm db:status`, then re-run.

**`supabase functions serve` returns 503 "name resolution failed"** — The edge-runtime container failed to start. Fixes in order of likelihood:

```bash
pnpm db:stop && (restart Docker Desktop) && pnpm db:start
docker pull public.ecr.aws/supabase/edge-runtime:v1.69.1   # match the CLI version
```

### Local (Part 2)

**`Runtime ZodError: APP_ENV: undefined`** — `.env.local` isn't reaching the app. Next reads it from `apps/<app>/`, not the workspace root. Fix:

```bash
pnpm env:init --force        # regenerates .env.local AND re-creates the symlinks into apps/auth + apps/web
```

**`UnrecognizedActionError: Server Action was not found on the server`** — Stale action ID in the browser after a dev restart. Hard-refresh (Cmd+Shift+R). If it recurs on every restart, check `.env.local` has `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` set (env-init generates it with a fixed local value; if it went missing, re-run `pnpm env:init --force`).

**Port 3000 / 3001 / 3002 / 3003 already in use** — Something's left over.

```bash
lsof -ti :3001 | xargs kill
```

**`auth.shesa.test` doesn't resolve** — `/etc/hosts` entries missing. See §2.2. `sudo dscacheutil -flushcache` on macOS to flush DNS after editing.

### Local Docker (Part 3)

**Docker Hub TLS handshake timeout on `pnpm compose:up`** — Cameroonian-network-to-Docker-Hub failure mode. Same registry mirror fix as the DB section. Or just retry — usually transient.

**EACCES writing to `/app/node_modules` inside the container** — Anon volume ownership. Should be fixed in the current `Dockerfile.next.dev` (runs as root on macOS Docker Desktop). If you see it, `pnpm compose:down`, `docker volume rm shesa-pnpm-store`, `pnpm compose:up` to rebuild.

**Container running but `curl localhost:3001` returns 500** — Look at the logs (`pnpm compose:logs`). Common causes: missing env value (Zod error at boot), Next hasn't finished compiling on first request, or a recently-added workspace dep isn't installed inside the container (fix: `docker compose -f infra/docker-compose.dev.yml exec auth pnpm install --frozen-lockfile --filter '@shesa/auth...'`, then `docker compose -f infra/docker-compose.dev.yml restart auth`).

**Cookies set in dev but `Secure` flag breaks them** — Local cookies are set with `secure: false` because `*.shesa.test` and `localhost:*` are HTTP. If you ever see "Secure" cookie warnings locally, check `APP_ENV=local` in `.env.local` — the cookie config branches on it.

---

## Related

- [`supabase/README.md`](../../supabase/README.md) — DB workflow + branch→env promotion model
- [`infra/README.md`](../../infra/README.md) — Docker + Caddy architecture, inside-container vs in-browser networking
- [`docs/phase-0/`](../phase-0/) — what shipped in Phase 0 and how to use it
- [`docs/standards/git-conventions.md`](../standards/git-conventions.md) — commit format + branch naming
- [`docs/adr/0007-tenancy-model-orgs-and-grants.md`](../adr/0007-tenancy-model-orgs-and-grants.md) — what's in the `core.scopes` table you're now looking at in Studio
