# 0008 — Transactional outbox for cross-domain side effects

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

When a charge is generated in `finance`, the `notifications` flow needs to react; when a member is transferred between Branches in `core`, several downstream domains care; when a Mobile Money webhook arrives in an Edge Function, the recorded payment must trigger receipt generation and balance updates. Naïve "after-write, fire the side effect" loses events whenever the process crashes between the write and the dispatch. For payments, that means real money — silent inconsistency between source and side effect.

## Decision

Use the **transactional outbox pattern**: in the same DB transaction that performs the business change, insert a row into the domain's `outbox` table (e.g. `finance.outbox`). A separate **relay** picks up committed outbox rows and dispatches them to handlers.

```
finance.recordPayment(...)
  TX: insert into finance.payments
      insert into finance.outbox (event: 'payment.recorded', payload: { ... })
  COMMIT (both rows together)

Relay → handler
```

### Relay implementation (in tiers, matching the background-jobs strategy in [ADR-0032](0032-hybrid-background-jobs.md))

**Tier A (now) — Supabase Database Webhooks + Edge Functions:**
- The outbox row insertion triggers a Database Webhook that invokes an Edge Function.
- The Edge Function dispatches the event (sends an email, updates a projection, writes to another schema's read view).
- The outbox row is marked `dispatched_at = now()` on success; retried on failure.
- pg_cron sweeps `dispatched_at IS NULL AND created_at < now() - interval '1 min'` as a backstop in case a webhook is missed.

**Tier B (later) — Node worker on the VPS:**
- When a class of events outgrows Edge Function limits (large mass dispatches, heavy processing), a small Node relay polls the outbox and enqueues into BullMQ on the worker container.
- Same outbox table, different consumer — only the dispatch path changes.

### Event naming

Past tense, namespaced: `member.transferred`, `charge.generated`, `payment.recorded`, `obligation.fulfilled`.

## Consequences

- The event row and the business change commit together; a crash can't lose the event.
- Handlers are downstream of the durable outbox table, not the request lifecycle.
- Event ordering is per-aggregate via the outbox sequence (good enough for the side effects Shesa needs).
- Adds an `outbox` table per domain that emits events, and a small relay (Edge Function now, possibly Node worker later).
- The dispatcher tier can change without changing the emitter — emitters always just insert into the outbox.

## Alternatives considered

- **Direct dispatch after write (no outbox)** — rejected: a crash between commit and dispatch loses the event. For payments, that's money.
- **Postgres LISTEN/NOTIFY only** — rejected: not durable; a missed `NOTIFY` is permanently missed. Works only as an optimization on top of an outbox poll.
- **Two-phase commit across DB and queue** — rejected: complex, queue support varies, and there's no queue in Tier A.
- **Supabase Realtime as the bus** — works for live UI updates but isn't a durable side-effect dispatcher. Use Realtime for "the UI sees this change" and outbox for "this side effect must run once."
