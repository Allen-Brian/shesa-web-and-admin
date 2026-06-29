# 0032 — Hybrid background jobs: Edge Functions now, VPS worker later

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Shesa's roadmap surfaces a range of background work: payment webhooks from MTN MoMo and Orange Money (fast, single-event); daily arrears checks (light, scheduled); monthly recurring charge generation across every active member (potentially thousands of rows in one job); mass notification cascades for arrears reminders (potentially thousands of recipients); bulk member imports from Excel; large report exports.

No single execution environment fits all of them. Supabase Edge Functions cap at 50–150s of execution and 256MB of memory — fine for webhooks and daily tasks, hostile to mass dispatches and bulk imports. A Node worker container with BullMQ + Redis handles the heavy end well but is operational overhead we don't need on day one.

## Decision

**Two tiers, added incrementally.**

### Tier A (active from Phase 0) — Supabase pg_cron + Edge Functions

- Webhook receivers (MTN / Orange callbacks — needs <5s response).
- Scheduled light tasks (daily arrears check, weekly stats, expiry checks).
- Per-event triggers (after auth signup, after insert).
- Single emails / SMS via Resend / Twilio / Termii / similar.
- Anything under 50–150s execution time and 256MB memory.

Dispatched by:
- **Supabase Database Webhooks** for "on insert / update / delete in this table" → invoke an Edge Function.
- **pg_cron** for scheduled work — calls Edge Functions or runs SQL directly.

### Tier B (added when needed) — Node worker container on the Contabo VPS

- Recurring charge generation (monthly, across every active member — can be thousands).
- Bulk member imports (Excel files with 1000+ rows).
- Mass notification cascades (arrears reminders to thousands of recipients).
- Large PDF / Excel generation.
- Anything CPU-heavy or long-running.

When Tier B lands:
- Worker container is a Docker Swarm service alongside the Next.js apps.
- Redis container is a sibling Swarm service (durable config — see [ADR-0018](0018-self-hosted-redis-on-api-droplet.md)).
- BullMQ holds the job queues; the relay polls the outbox ([ADR-0008](0008-transactional-outbox.md)) and enqueues.
- Worker is a separate container from the apps so a heavy job can't block a Server Action.

### Rule for choosing the tier

**Default to Tier A.** Pick Tier B only when a specific job demonstrably can't run in Edge Functions — typically because of duration, memory, or dependency on a Node-only library. The first such job earns the worker container; subsequent jobs of similar shape go into the same worker.

## Consequences

- Day-one ops surface is small: just Supabase + Cloudflare + the Next.js apps on the VPS.
- The transactional outbox pattern ([ADR-0008](0008-transactional-outbox.md)) is the same whether the dispatcher is an Edge Function or a Node relay — emitters don't change when Tier B arrives.
- Predictable migration path: when Phase 3 (Finance) or Phase 6 (Notifications) produces a job that doesn't fit Tier A, we add the worker container without re-architecting.
- Two execution environments to know (Deno for Edge Functions, Node for the worker) — minor cognitive cost.
- Edge Functions run on Supabase's globally distributed runtime; the worker runs in Frankfurt. Mixing the two is fine for our patterns.

## Alternatives considered

- **Edge Functions only** — rejected: Shesa's Finance and Notifications phases produce jobs that exceed the limits. Picking this would mean rewriting key jobs later.
- **Node worker container from day one** — rejected: premature complexity. We don't have a job yet that needs it.
- **External job runner (Inngest, Trigger.dev, Hookdeck)** — considered: clean offering, but adds a vendor for something we can run ourselves on the VPS we already have. Reconsider if ops on the worker become painful.
- **AWS Lambda / Cloud Functions** — rejected: cross-vendor, more configuration for the same outcome.
