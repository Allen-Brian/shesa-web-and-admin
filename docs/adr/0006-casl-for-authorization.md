# 0006 — Two-layer authorization: RLS as primary, Server Action policy as second layer

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Authorization in Shesa is multi-faceted: a member's effective permissions depend on their functional role (Admin, Finance), permission flags (Editor, Recruiter, Announcer), position badges (President, Treasurer, etc.), and the org node they hold those at (Branch X, Chapter Y, Batch Z). Hand-rolling permission checks throughout Server Actions leads to drift and missed cases. We also need defense-in-depth: a buggy Server Action shouldn't be the only thing standing between a member and another Branch's data.

## Decision

**Two layers, both mandatory.**

### Layer 1 — Supabase Row-Level Security (primary)

Every table in every schema (`core`, `finance`, `cms`, `connect`) has RLS enabled. Policies are authored per schema and reference the JWT claims set by Supabase Auth + the member's role / position rows in `core`.

- A misbehaving client cannot bypass RLS — it runs inside Postgres, below the API surface.
- The Supabase anon key + RLS is what makes "Supabase as a BaaS" safe (see [ADR-0030](0030-supabase-as-baas-with-server-actions.md)).
- Policies are version-controlled in SQL migrations and reviewed in the same PR as the tables they protect.

### Layer 2 — Server Action / Edge Function policy module

A small policy module in `packages/domain/policy/` answers `can(member, action, resource)` for every action the apps perform. Server Actions and Edge Functions call it before any mutation:

```ts
if (!policy.can(member, 'charge.create', { branchId })) {
  throw new ForbiddenError('charge.create', { branchId });
}
```

- **Permissions catalog:** `resource.action` (`member.read`, `charge.create`, `forum.post.publish`).
- **Resolved per request:** functional roles + permission flags + positions → effective permissions + the set of org nodes (Branch / Chapter / Batch / House / Sector) the member can act on.
- The policy module is the single place that knows how to combine roles + flags + positions. Server Actions never re-implement the logic.

### Why both

- **RLS alone** is enforcement, but it makes UX awkward: a forbidden action surfaces as "no rows returned" instead of a clean `FORBIDDEN` error with a useful message. Server Actions check policy first to return the right error envelope (see [ADR-0009](0009-standardized-error-envelope.md)).
- **Server Action policy alone** is bypassable: a bug, a missed check, or future direct supabase-js access from a client would skip it. RLS is the always-on guard.

## Consequences

- Permission checks are centralized in `packages/domain/policy/` — adding a permission to a role doesn't require code changes scattered across Server Actions.
- RLS policies are part of the schema; they migrate with the tables.
- Role rename / refactor doesn't break authorization logic because nothing checks role names — only resolved permissions.
- Writing RLS policies is harder than writing TypeScript — the policy module helps but doesn't eliminate the need for SQL fluency.
- Both layers cost CPU; both are cheap at our scale.

## Alternatives considered

- **CASL** — considered (the Yimo ADR's choice). Works, but for Shesa's permission model (functional roles + flags + positions, all org-node-scoped) a small custom policy module is simpler and avoids dragging in a library when ten functions do the job.
- **Hand-rolled `if (role === ...)` checks** — rejected: drift, missed cases, role-rename fragility.
- **RLS only** — rejected: poor error UX, and clients ship with elevated trust (the BaaS pattern depends on the assumption that the client may try anything).
- **Server Action policy only, no RLS** — rejected: no defense in depth.
- **Oso / OPA** — considered: more powerful but more operational complexity (a separate policy service) than the team needs.
