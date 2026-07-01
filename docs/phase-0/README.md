# Phase 0 — Foundation & Project Setup

Phase 0 is the substrate every later phase builds on. **Not a usable product.** Members can't sign up, finance can't collect dues, CMS can't publish. What ships is the plumbing: monorepo, RBAC, audit, notifications, storage, four app shells, one central auth app, tests, CI/CD, and the deploy pipe to a Contabo VPS.

The point of the phase: once it's done, Phase 1 (Core Domain) can start writing real business logic without stopping to lay any more foundation.

## Deliverables

| Epic | What shipped                                                                                |
| ---- | ------------------------------------------------------------------------------------------- |
| E0   | Monorepo bootstrap: pnpm workspaces + Turborepo + commitlint + husky                        |
| E1   | Shared packages skeleton: `@shesa/{tsconfig,eslint-config,config,types,domain,supabase,ui}` |
| E2   | Supabase local + `core`, `audit`, `notifications` schemas                                   |
| E3   | RBAC schema + `core.has_permission` security-definer checker                                |
| E4   | Audit central table + per-entity `core.role_history` mirror                                 |
| E5   | RLS policies (deny path + happy path pgTAP suite)                                           |
| E6   | Notifications schema + pgmq queues                                                          |
| E7   | Storage buckets (3 public, 3 private) + policies                                            |
| E8   | Edge Functions: check-permission, grant/revoke-role, notification dispatch                  |
| E9   | Central auth app (`apps/auth`) — login / forgot / reset / logout                            |
| E10  | Public web app (`apps/web`, Next) + `apps/exco`, `apps/finance` (Vite SPA)                  |
| E11  | shadcn/ui primitives (Button, Input, Label, Card) vendored in `@shesa/ui`                   |
| E12  | Vitest + RTL + Playwright wired; 24 unit tests + 2 e2e specs                                |
| E13  | GitHub Actions: CI, commit lint, pgTAP, staging + production deploys                        |
| E14  | Prod Dockerfiles (Next + Vite) + Docker Swarm compose + prod Caddy config                   |
| E15  | This documentation                                                                          |

## How to use these docs

- **[local-setup.md](local-setup.md)** — clone → running stack → login form.
- **[migrations.md](migrations.md)** — author a migration, apply it locally, ship it to staging/prod.
- **[rbac.md](rbac.md)** — add a permission, a role, a role-permission mapping.
- **[storage.md](storage.md)** — add a bucket and its RLS policy.
- **[deployment.md](deployment.md)** — how staging + production actually deploy.
- **[testing.md](testing.md)** — unit / component / e2e / pgTAP test layout.

For decisions behind these deliverables, see the [ADR index](../adr/README.md). For terminology, [glossary.md](../glossary.md).

## Phase 0 done-criteria (18)

1. `git clone && pnpm install && pnpm db:start && pnpm db:migrate && pnpm db:seed && pnpm dev` brings the stack up locally
2. `supabase status` shows all services + six schemas
3. `pnpm typecheck` passes
4. `pnpm lint` passes
5. `pnpm build` builds every app
6. `pnpm test` passes
7. `pnpm test:db` (pgTAP) passes
8. `pnpm test:e2e` passes (after `pnpm test:e2e:install` for Chromium)
9. Auth app: sign in, cookie visible on sibling subdomain
10. Unauthenticated hit to a protected app redirects to auth (Phase 1+ once SPAs are wired to the session bridge)
11. Grant a role via Edge Function → `role_assignments`, `audit_entries`, `role_history` all populated
12. Revoke via Edge Function → subsequent `has_permission` returns false; audit + history updated
13. Enqueue notification → pgmq → dispatch → send-email → Resend test message arrives
14. `send-sms-stub` logs the would-be SMS with `provider=stub`
15. Anon upload to `member-documents` blocked; anon read of `public-gallery` allowed
16. CI green on a PR; staging deploys on push to `develop`; prod deploys on push to `master` with manual approval
17. `apps/connect` is INTENTIONALLY absent — Connect is out of Phase 0 scope
18. Staging cross-subdomain SSO through Cloudflare + Caddy: login at `staging-auth.shesaconnect.com`, session readable at `staging-finance.shesaconnect.com` (real cert at origin + `cf-ray` header in path)

## Deferred to Phase 1+

- Phone-OTP login (needs MTN/Orange real-SIM delivery test — ADR-0019)
- SPA cross-subdomain SSO (needs a `/api/session` bridge on `apps/auth`)
- Cameroon Personal Data Protection Authority registration (ADR-0020) — required before production launch
- Chromium download for the E2E suite (`pnpm test:e2e:install`) — a runbook step, not scaffolded here
