# 0030 — Supabase is the BaaS; Server Actions wrap it for Next.js apps

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

There's a real architectural fork when building on Supabase: treat it as "just a managed Postgres" and put a separate API service (Node / NestJS / Hono) in front, or treat it as a Backend-as-a-Service and let clients call it directly with the anon key + RLS. Each choice ripples through every other infrastructure and operational decision.

A separate API service adds an entire deployable component to operate, a typed client to generate, and another layer of types to keep in sync. For a small team building a multi-app product with no need for a stable language-agnostic API, that's pure overhead.

## Decision

**Shesa uses Supabase as a Backend-as-a-Service. No separate Node API.**

### For Next.js apps (`web`, plus `exco` / `finance` / `connect` if they're Next)

- **Reads:** Server Components and client components call `supabase-js` directly using a request-scoped client (`@supabase/ssr`). RLS enforces access.
- **Mutations:** wrapped in **Server Actions** or Route Handlers — the layer that holds idempotency keys ([ADR-0015](0015-idempotency-keys-mandatory.md)), policy checks ([ADR-0006](0006-casl-for-authorization.md)), and the standardized error envelope ([ADR-0009](0009-standardized-error-envelope.md)).
- **Webhooks** (MTN MoMo, Orange Money, third-party services) land in Route Handlers or Supabase Edge Functions.

### For plain React apps (Vite, no SSR)

- `supabase-js` is called directly from components via TanStack Query hooks. RLS still enforces access.
- Mutations that need policy checks or idempotency call **Edge Functions** as a substitute for Server Actions.

### Hard rules

- **The Supabase service-role key is allowed only in Server Actions, Route Handlers, and Edge Functions.** Never imported into a browser bundle. Enforced by `dependency-cruiser` + ESLint `no-restricted-imports`.
- **All write paths that need idempotency, policy enforcement, or a domain error response go through Server Actions / Edge Functions** — not raw supabase-js mutations from the client.
- **Read paths may use raw supabase-js** as long as RLS protects them.

## Consequences

- One less deployable service to operate (no Node API on the VPS just to wrap Supabase).
- Types come from `supabase gen types` — no codegen pipeline for an OpenAPI spec we'd otherwise have to maintain.
- Layering for Next apps becomes: **Component → Server Action → supabase-js**. For React apps: **Component → TanStack Query hook → supabase-js**.
- Authorization correctness depends on RLS being right — and on the policy module being called before every mutation. Both layers must be present.
- Vendor lock-in to Supabase is real and deeper than if we ran a Node API. Mitigation: the data layer (`packages/supabase`) is the only place that imports supabase-js; if we ever migrate, only that boundary changes.
- The Yimo "Supabase is not a BaaS" stance (their ADR-0017, deleted here) is explicitly reversed for Shesa.

## Alternatives considered

- **Separate Node API in front of Supabase** (Yimo's model) — rejected: too much overhead for the team size. Adds a service to deploy, monitor, and scale.
- **Next.js Route Handlers only, no Server Actions** — considered: works, but Server Actions are the modern Next idiom and pair beautifully with shadcn/ui forms via `useActionState`.
- **PostgREST / supabase-js for everything including writes** — rejected: no clean place to put idempotency keys, policy checks, or domain error mapping.
- **tRPC** — considered: would work, but adds a layer that doesn't earn its keep when Server Actions already give us typed RPC.
