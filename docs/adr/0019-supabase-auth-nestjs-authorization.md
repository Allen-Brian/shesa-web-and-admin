# 0019 — Authentication: Supabase Auth; Authorization: RLS + Server Actions

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Authentication (verifying who someone is) and authorization (deciding what they can do) are distinct concerns. Building authentication from scratch — password reset, phone OTP, magic links, refresh tokens — is months of work and a security minefield. Authorization is domain-specific to Shesa and must live in our code.

## Decision

- **Authentication:** **Supabase Auth** (login, sessions, refresh tokens, phone OTP, email OTP, magic links). The user-facing flows (email-invite-then-claim per the Member Engine) build on Supabase Auth's invite + recovery flows.
- **Authorization:** the **two-layer model from [ADR-0006](0006-casl-for-authorization.md)** — Supabase RLS as primary, Server Action / Edge Function policy module as second layer.
- `auth.users` (Supabase) is the **canonical identity anchor**. Our `core.memberships`, `core.role_grants`, and `core.position_grants` tables all reference `auth.users.id` — **no hand-rolled credentials table**.

### Login flow

```
Browser → Supabase Auth (OTP / magic link / password)
       → JWT cookie (httpOnly, scoped to root domain — see ADR-0014)
Server Action / Edge Function
       → @supabase/ssr reads cookie, resolves the JWT
       → policy module loads the member's roles / flags / positions
       → enforces access
       → uses the user-scoped supabase client (RLS applies)
       OR
       → uses the service-role client only when policy explicitly approves a privileged action
```

### Service-role rule

The Supabase **service-role key bypasses RLS**. It is allowed **only** inside Server Actions, Route Handlers, and Edge Functions — never in browser bundles. Lint rule (`no-restricted-imports`) blocks importing the service-role client outside server-side entry points.

### Market-risk action

Validate Supabase phone OTP actually delivers to **MTN and Orange Cameroon** numbers (cross-border SMS is a common failure point). Fallback paths if deliverability is poor: email-only login, WhatsApp OTP via a local aggregator (Termii / similar) invoked from an Edge Function.

## Consequences

- We don't run password reset, OTP infrastructure, or refresh-token rotation code — Supabase does.
- Authorization stays in our code where it belongs.
- One identity anchor (`auth.users.id`) used everywhere — no duplicate user tables.
- Tied to Supabase as a vendor for auth — migration would be painful but rare.
- The Member Engine's "create account → email invite → claim" maps to Supabase Auth's invite flow (`supabase.auth.admin.inviteUserByEmail`); the row in `core.memberships` is created when the invite goes out, linked when the user claims.

## Alternatives considered

- **Roll our own auth** — rejected: months of work, security risk.
- **Auth0 / Clerk** — considered: comparable; we already pay for Supabase Postgres so consolidating is cheaper.
- **Keycloak** — rejected: ops overhead doesn't match the team size.
- **Server-side auth only (no Supabase RLS)** — rejected: loses defense in depth, and clients lose the ability to call supabase-js directly for reads (which is the whole point of the BaaS approach — see [ADR-0030](0030-supabase-as-baas-with-server-actions.md)).
