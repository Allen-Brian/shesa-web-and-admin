# Testing

Three test surfaces, three commands:

| Surface                                        | Runner       | Command         | Runtime      |
| ---------------------------------------------- | ------------ | --------------- | ------------ |
| Unit + component                               | Vitest + RTL | `pnpm test`     | Node + jsdom |
| End-to-end                                     | Playwright   | `pnpm test:e2e` | Chromium     |
| Database (RLS + permission checker + policies) | pgTAP        | `pnpm test:db`  | Postgres     |

## Unit + component (Vitest)

Tests live next to source: `packages/**/*.test.ts(x)`, `apps/**/*.test.ts(x)`. One root config: `vitest.config.ts`.

Pure-logic tests default to Node environment. Component tests opt into jsdom via a per-file pragma:

```tsx
// @vitest-environment jsdom
```

`vitest.setup.ts` registers jest-dom matchers (`toBeInTheDocument`, `toHaveClass`, ...) and wires an explicit `afterEach(cleanup)` so RTL renders don't accumulate across tests.

### What Phase 0 has

- `packages/domain/src/rbac/policy.test.ts` — createPolicy wrapper contract
- `apps/auth/src/lib/safe-redirect.test.ts` — the same-apex redirect sanitizer (11 assertions covering both accept + reject paths)
- `packages/ui/src/lib/cn.test.ts` — twMerge conflict resolution
- `packages/ui/src/components/button.test.tsx` — Button smoke (asChild, variant, onClick, disabled)

## End-to-end (Playwright)

`apps/auth/playwright.config.ts` + `apps/auth/tests/login-page.spec.ts`. Chromium only for Phase 0 (Firefox / WebKit add ~500 MB of binaries for near-identical coverage).

The Chromium binary is NOT installed by `pnpm install` — download once with:

```
pnpm test:e2e:install
```

Then:

```
pnpm test:e2e
```

The Playwright config's `webServer` boots `pnpm dev` if nothing's listening on 3001, so the tests work alongside an interactive dev session.

### What Phase 0 has

- Login page renders (heading, form fields resolvable via `<Label htmlFor>`, submit button, forgot-password link)
- Forgot-password link navigates to `/forgot-password`

A full sign-in-with-credentials E2E flow lands with CI (E13) — it needs a seeded test user in Supabase Auth.

## Database (pgTAP)

Every migration that introduces a new RLS policy or security-definer function should ship with a pgTAP file. See [migrations.md](migrations.md) — Test it section for the template.

Files live under `supabase/tests/*.test.sql`. `pnpm test:db` spins up a scratch schema, applies migrations, runs assertions, tears down. Fully isolated per invocation.

### What Phase 0 has

47 tests across:

- `audit_append_only.test.sql` — the append-only trigger on `audit.audit_entries`
- `role_history_mirror.test.sql` — role grant / revoke writes both audit_entries AND core.role_history
- `rls_core.test.sql` — 11 assertions covering deny path AND happy path per policy
- `rls_audit.test.sql` — audit table RLS (5 assertions)
- `notifications_rls.test.sql` — notification event + delivery RLS (8 assertions)
- `storage_buckets.test.sql` — public/private policy split (9 assertions)

## CI enforcement

- `.github/workflows/ci.yml` runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` on every PR + push to `develop`/`master`.
- `.github/workflows/db-test.yml` runs `pnpm test:db` after booting the Supabase CLI in the runner.
- Both are configured as **required status checks** for `develop` and `master` under branch protection — a red pgTAP run is a hard merge block.
- Deploy workflows won't run until BOTH have succeeded at the same head SHA.
