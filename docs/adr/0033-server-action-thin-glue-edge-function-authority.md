# 0033 — Server Action thin glue + Edge Function authority

- **Status:** accepted
- **Date:** 2026-06-30
- **Deciders:** Lead

## Context

ADR-0030 settled the "Supabase as the BaaS" stance — Server Actions for Next apps, supabase-js for reads, service-role only on the server side. What it left open is the split of responsibilities WITHIN the server side. When an app's form-submit handler — a Server Action — needs to grant a role, record a payment, dispatch a notification, **where exactly does the authorization decision live, and where does the business write happen?**

Two extremes are both viable in isolation but wrong for Shesa:

1. **All-in-Server-Action.** The Server Action checks permissions itself, calls `supabase-js` with the service-role client, mutates tables. Fast, no extra hop. But every app (web, exco, finance, connect) re-implements the same logic; webhooks and cron run their own copy too. Permission checks drift. Audit calls get forgotten in one path and not another. The four apps × two non-app paths (webhook, cron) = six places "grant role" exists, six places to keep in sync.

2. **All-in-Edge-Function-direct-from-client.** Client components call the Edge Function over fetch. No Server Action layer. Loses the typed RPC ergonomics, hand-rolls auth context per call, and tempts components into knowing about function URLs and headers.

Phase 0's planning session decided the middle path. This ADR records it.

## Decision

**Two layers, one authority.**

```
[ Component ]               ← UI
     │
     ▼
[ Server Action ]           ← envelope (THIN GLUE)
     │   - resolves the JWT session
     │   - parses input with Zod
     │   - generates / forwards idempotency key + traceId
     │   - shapes errors into the standard envelope (ADR-0009)
     │
     ▼
[ Edge Function ]           ← single business authority
         - calls policy.has(member, action, scope) BEFORE doing anything
         - runs business rules
         - writes via Postgres functions / RLS-aware supabase-js
         - emits audit entries
```

### Server Action — the envelope

The Server Action **owns the request shape, not the business decision.** Its job is:

- Read the Supabase Auth cookie via `@supabase/ssr` (already set by `apps/auth`).
- Parse `formData` / JSON arguments with a shared Zod schema (`@shesa/domain/validators`).
- Generate or forward an idempotency key (per ADR-0015) and a `traceId`.
- Invoke the Edge Function with those arguments.
- Catch the Edge Function's response and map it to a typed result the component can consume.
- Shape any thrown error into the standard envelope (ADR-0009).
- Trigger Next's `revalidateTag` / `revalidatePath` on success.

**It does not** make authorization decisions. It does not call `core.has_permission` directly. It does not write to business tables. It does not access the service-role client (that's permitted in Route Handlers and Server Actions per ADR-0030, but for Shesa we route through Edge Functions to keep the authority single).

### Edge Function — the single business authority

Every authoritative write path in Shesa — app form submit, MTN/Orange webhook, pg_cron scheduled job — ends at an Edge Function. The Edge Function:

- Validates input AGAIN with the same Zod schema (defense in depth — the Server Action validated for shape, the Edge Function validates because it's also called from contexts without a Server Action).
- Calls `policy.has(member, action, scope)` — the central authorization check.
- Performs the business write (typically via a Postgres function for transactional integrity).
- Writes audit entries via `audit.log_event(...)` on every outcome including denial.
- Returns success or a standard error envelope.

The Edge Function is the **single place** authorization for a given action lives. Add a permission flag here once; every caller (four apps, webhooks, cron) gets it.

### Why this specifically

The dangerous alternative — option 3 in the planning session — was "Server Action checks permission and writes directly; Edge Function only for webhooks/cron." It looks tidier (one less network hop). It's the trap. The moment in-app mutations and out-of-app mutations have different write paths, they have different authorization implementations. For a money system, that's how the ledger ends up with rules enforced in one path and not the other.

One write authority. Reached the same way by apps, webhooks, and cron. That's the property worth protecting.

## Consequences

**Bought:**

- Single authoritative write path for every mutation. Apps, webhooks, and cron converge on the same Edge Function. Rules can't drift across surfaces.
- Server Actions stay small and uniform — they're glue, not logic. Junior devs can write one without understanding the full permission model.
- Audit trail is guaranteed at the Edge Function layer regardless of which app called.
- Idempotency keys + traceId flow end-to-end (Component → Server Action → Edge Function → Postgres → logs).
- Migration to a future Tier B Node worker (ADR-0032) doesn't disturb apps — the worker calls the same Edge Functions to do work.

**Paid:**

- One extra network hop per mutation (Server Action → Edge Function). At Shesa's scale this is negligible (~30–100ms intra-region); correctness wins easily.
- A Server Action wrapping each Edge Function is a small amount of boilerplate. Mitigated by a `createServerActionForEdgeFn(name, schema)` helper added when the repetition becomes real (rule of three).
- Two places to type each action (Zod schema in domain package, used by both Server Action and Edge Function). The schema is the shared truth so they can't diverge.
- Edge Function call from a Server Action must keep the idempotency key — a retried Server Action invocation should NOT re-execute the Edge Function for the same user intent. Enforced by `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING` at the Edge Function side (per ADR-0015).

**Subordinated:**

- ADR-0030's "Server Actions wrap mutations" stance is REFINED here, not replaced. Server Actions still wrap mutations from the app's perspective; they just delegate the authoritative work to an Edge Function rather than executing it inline. The envelope responsibilities — session, Zod, idempotency, traceId, error shape — stay at the Server Action layer where they belong.

## Alternatives considered

- **All-in-Server-Action** (option 1 above) — rejected: drift across apps, drift between apps and webhooks/cron. Authorization implementation duplicated four-plus times.

- **Component → Edge Function directly** (option 2) — rejected: re-implement session handling, error shaping, and idempotency per component. Component knows about backend URLs. Server Actions are the modern Next idiom; skipping them buys nothing.

- **Server Action does business writes, Edge Function only for webhooks/cron** (the dangerous middle path) — rejected: creates two authorization implementations that WILL drift. The whole point of this ADR is that drift is the failure mode.

- **tRPC instead of Server Actions + Edge Functions** — considered: works, but Server Actions are now the Next-native way; adding tRPC is a third concept to learn and an extra layer to debug. Server Actions + Edge Functions give us typed RPC without the additional dependency.

- **Skip Server Actions entirely, use Route Handlers** — considered: Route Handlers are slightly lower-level. Server Actions integrate better with shadcn/ui Form + `useActionState`, and for the "form submit → mutate → revalidate" flow they're the cleanest abstraction. Route Handlers still get used for webhooks (the Edge Function can also be a Route Handler if hosted in the Next app, but Edge Functions in Supabase are cleaner because they share the auth + RLS context with the database).
