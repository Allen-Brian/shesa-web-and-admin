# Local setup

The canonical step-by-step lives in **[../runbooks/local-dev-setup.md](../runbooks/local-dev-setup.md)** — it covers system prerequisites (Node 22, pnpm 9.15, Docker Desktop, Supabase CLI), `/etc/hosts`, `.env.local`, and the docker-compose flow.

This document lists the **shortcut path** and the **failure modes** you'll hit if you skip a step.

## Shortcut path (fresh clone)

```bash
git clone https://github.com/Evar-SF27/Shesa-App.git shesa
cd shesa
pnpm install

# Supabase local (postgres + auth + storage on ports 54321-54324)
pnpm db:start
pnpm db:migrate
pnpm db:seed

# .env.local at the repo root + symlinks into apps/auth + apps/web
pnpm env:init

# The auth app on http://localhost:3001
pnpm --filter @shesa/auth dev

# Or the whole compose stack (auth published direct; caddy commented
# out until docker hub is reachable and E10's sibling apps need it)
pnpm compose:up
```

## Common failure modes

**`APP_ENV: undefined` Zod error on the first request.** Next.js reads `.env.local` from `apps/<app>/`, not from the workspace root. `pnpm env:init` symlinks the root file into each Next app; if you skipped it, either re-run env:init or symlink manually:

```
ln -sfn ../../.env.local apps/auth/.env.local
ln -sfn ../../.env.local apps/web/.env.local
```

**`UnrecognizedActionError` after a dev restart.** Next Server Action IDs are signed with `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. Local uses a fixed zero-key so IDs stay stable across restarts — but if you had a page loaded from BEFORE the key was added, hard-refresh (Cmd+Shift+R) once to flush the stale IDs.

**Docker Hub TLS handshake timeout on `docker compose up`.** Cameroonian network reach to `registry-1.docker.io` is flaky. Two options: retry, or add `"registry-mirrors": ["https://mirror.gcr.io"]` under Docker Desktop → Settings → Docker Engine.

**Port 3001 already in use.** Something's left running. `lsof -ti :3001 | xargs kill`. The compose stack also publishes 3000 (web), 3002 (exco), 3003 (finance) — same trick if any of them is stuck.

**`RESEND_API_KEY` Zod check fails at boot.** env-init leaves this as an empty placeholder because Resend needs a real signup. Set it to any non-empty string for local (`RESEND_API_KEY=placeholder`) — the send-email edge function won't actually deliver until it's a real key, which is fine until you exercise the password-reset flow.

## Verifying it worked

- `curl -sI http://localhost:3001` → `HTTP/1.1 200 OK`
- `curl -sSI http://localhost:3001 | grep set-cookie` → nothing until you sign in
- Log in with a user you seeded in Supabase Studio (http://127.0.0.1:54323 → Authentication → Users → Add user), then check DevTools → Application → Cookies for `sb-*` entries
