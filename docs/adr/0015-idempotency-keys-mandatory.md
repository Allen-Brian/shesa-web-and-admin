# 0015 — Idempotency keys mandatory on payment / critical mutations

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Cameroonian members are on flaky 3G. A Server Action that records a Mobile Money payment may time out, succeed silently, and be retried by TanStack Query or the user — charging twice. Without idempotency, network reliability becomes a financial-correctness problem.

## Decision

For **every mutating action that must not run twice** — pay a charge, registration fee, pay-on-behalf, manual cash entry, recurring billing trigger — the **client generates a UUID once per user action and reuses it across all retries**. The Server Action / Route Handler / Edge Function accepts an `idempotencyKey` argument; the backend dedupes on the key.

This is **non-negotiable for payment flows**.

The dedup store is a Supabase table (`core.idempotency_keys`) with a unique index on the key + a `created_at` for windowed cleanup. Each idempotent action:

1. Inserts the key row inside the same transaction as the business change.
2. On a duplicate key error, returns the stored result instead of running the action again.

A pg_cron job drops rows older than the dedup window (e.g. 24h).

## Consequences

- A dropped 3G connection retries safely; the server recognizes the second arrival of the same key and returns the original result.
- TanStack Query mutations stay safe to retry only when an `idempotencyKey` is provided (`{ mutations: { retry: 0 } }` is the default; opt in per mutation).
- One extra row per critical mutation — cost is dwarfed by what double-charges would cost.
- Implicitly couples client and server: the client must send the key correctly, the server must honor it.
- Webhook receivers (MTN, Orange) also use idempotency on the provider's transaction id to dedupe duplicate callbacks.

## Alternatives considered

- **No idempotency, hope for the best** — rejected: real money lost on real networks.
- **Server-only natural-key dedup** — works for some operations (a payment with a unique external txn id) but doesn't generalize to actions without a natural key.
- **Client-side request cancellation only** — rejected: doesn't help when the request reached the server before the timeout.
- **Redis-backed dedup store** — rejected for now: no Redis in the stack until a Node worker is added (see ADR-0018). Supabase Postgres handles this fine at our scale.
