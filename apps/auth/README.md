# @shesa/auth — central authentication app

Runs at `auth.shesa.test:3001` locally and `auth.shesa.org` in staging / prod. Its single job: write the Supabase Auth session cookie scoped to the apex domain (`.shesa.org`) so every other Shesa app (`web`, `exco`, `finance`, `connect`) reads the same session without re-authenticating.

## Phase 0 scope

- Email + password sign-in
- Email magic link (passwordless option)
- Sign out
- Forgot password / reset password
- Invite-acceptance placeholder (full flow lands in Phase 1 when the Member Engine ships)
- Auth callback Route Handler — writes the shared cookie

**Phone-OTP is intentionally NOT in Phase 0.** Per the planning session's OTP go/no-go input (ADR-0019 + the E9 spec): we need real MTN MoMo + Orange Cameroon SIMs to validate Supabase Auth's SMS delivery before promising phone-OTP login. The conservative path — email-only for v1 — keeps the auth surface small. When SMS is validated (Phase 6), phone-OTP layers on top of this same app without rewriting the cookie/middleware plumbing.

## Architecture

```
Browser  →  auth.shesa.test:3001  (this app, Caddy reverse proxy locally)
              │
              ├── /                       login page
              ├── /forgot-password
              ├── /reset-password
              ├── /invite                 placeholder
              └── /auth/callback          writes the apex-domain cookie
                  │
                  └── packages/supabase/src/server.ts
                      → @supabase/ssr     cookie domain = .shesa.org
                                         httpOnly + Secure + SameSite=Lax

Then on every other Shesa subdomain:
  finance.shesa.test:3003  middleware reads the same cookie  →  session resolved
```

The cookie-domain magic lives in `packages/supabase/src/cookie-config.ts`. This app just composes it.

## Local dev

```bash
# From the repo root:
pnpm db:start                  # boot Supabase (Auth, Postgres, etc.)
pnpm env:init                  # writes apps/auth/.env.local with the captured Supabase keys
pnpm --filter @shesa/auth dev  # starts Next on http://auth.shesa.test:3001

# Or via Docker (matches staging/prod):
docker compose -f infra/docker-compose.dev.yml up auth
```

`/etc/hosts` must map `auth.shesa.test` → `127.0.0.1`. See `docs/runbooks/local-dev-setup.md` step 2.

## Files (post-E9)

```
src/
  app/
    layout.tsx                 root layout + token import
    page.tsx                   login page (E9c)
    forgot-password/page.tsx   E9c
    reset-password/page.tsx    E9c
    invite/page.tsx            E9c placeholder
    auth/
      callback/route.ts        E9b — Route Handler, writes the cookie
      logout/route.ts          E9c — clears the cookie + redirects
  middleware.ts                E9b — refreshes the session on every request
```

## Deployment

Same `Dockerfile.next` as every other Shesa app (E14). Caddy / Cloudflare in front terminate TLS. Cloudflare zone for `shesa.org` proxies traffic to the Contabo VPS; the Caddy vhost for `auth.shesa.org` reverse-proxies to this container.
