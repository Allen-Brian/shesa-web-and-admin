# 0005 — Cross-domain communication: shared domain package + database events

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Shesa's domains live in separate Postgres schemas (`core`, `finance`, `cms`, `connect` — see [ADR-0003](0003-schema-per-domain-single-postgres.md)). The easiest thing for a Server Action in one domain to do is reach into another schema and query its tables directly. That undoes the schema boundary in one query — exactly the failure mode the split was supposed to prevent.

## Decision

A Server Action / Edge Function / component in one domain **never reads or writes another domain's tables directly**. Two paths only:

1. **Synchronous reads or commands:** call the owning domain's **public helpers** exported from `packages/domain/<domain>/`. The helper holds the cross-schema query in one place; consumers stay decoupled from the schema layout.
2. **Asynchronous cross-domain side effects:** emit a **database event** (past tense, namespaced: `member.transferred`, `charge.generated`, `payment.recorded`). Other domains subscribe — via Postgres triggers writing to their own projection tables, or via Edge Functions consuming an outbox feed (see [ADR-0008](0008-transactional-outbox.md)).

Cross-domain reads that need ad-hoc joining go through an **owned projection or explicit read view** owned by one schema — not by a domain that's just visiting.

## Consequences

- Schema boundaries are enforceable: a Server Action in `finance` only ever queries `finance.*`; cross-domain access goes through the domain package.
- Refactoring one domain's table shape doesn't break another that just listens for events.
- Read models can be optimized per domain without coordinating with publishers.
- More upfront friction than "just join the schemas" — pays back as the system grows.
- Pairs with the outbox pattern ([ADR-0008](0008-transactional-outbox.md)) so events can't be lost on crash.

## Alternatives considered

- **Free cross-schema queries from anywhere** — rejected: undoes the boundary.
- **Schema-level GRANTs to enforce isolation** — considered: Postgres-level enforcement, but blocks even read views; harder to use Supabase RLS uniformly.
- **Synchronous-only inter-domain calls** — rejected: creates hidden coupling where domain A always blocks on domain B for B's side effects.
