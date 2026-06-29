# 0018 — Self-hosted Redis on the Contabo VPS (future-state for the Node worker)

- **Status:** accepted (deferred implementation)
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Shesa starts with all background jobs running on Supabase pg_cron + Edge Functions (Tier A — see [ADR-0032](0032-hybrid-background-jobs.md)). When a job class outgrows Edge Function limits (mass notification cascades, recurring charge generation across thousands of active members, bulk imports, large Excel exports), Shesa adds a **Node worker container** on the Contabo VPS (Tier B). That worker needs a queue, and BullMQ requires Redis.

This ADR captures the runtime + config decisions for Redis **when it lands**, so the future implementation isn't an open question.

## Decision

When Tier B is added, run **Redis (or Valkey) in a Docker Swarm service on the same Contabo VPS** as the Next.js apps and the Node worker. Cheapest, lowest latency (intra-stack overlay network), and consistent with a single-VPS failure domain — managed HA Redis buys resilience that the single-VPS compute layer doesn't have anyway.

**Required safe configuration** (a careless Redis container silently drops jobs):

- **Persistence:** `appendonly yes`, `appendfsync everysec`, data dir on a mounted Docker volume.
- **`maxmemory-policy noeviction`** — LRU policies silently delete queue keys and corrupt BullMQ. Reject writes instead, size RAM with headroom.
- **`requirepass`** sourced from a Docker Swarm secret; **never publish the Redis port** outside the overlay network.
- **Single replica, placement on the manager node** until the cluster genuinely grows beyond one VPS.

Operational detail (Swarm service definition, volume layout, secret creation, host tuning) lives in `infra/swarm/redis.md` when the service is added.

## Consequences

- Localhost-level latency between the worker and the queue (same overlay network).
- One less monthly bill; one less vendor.
- Persistence on a volume survives container restart and VPS reboot.
- Single-VPS failure = both worker and queue go down together (consistent failure domain).
- **Graduate to managed Redis when:** the apps span multiple VPSes, payment volume makes job durability business-critical beyond what AOF persistence provides, or Redis memory starves the apps.
- **Until Tier B lands, this ADR is documentation only — no Redis container runs.**

## Alternatives considered

- **Upstash (free tier)** — works but cross-region adds latency; we'd never want a free-tier prod queue anyway.
- **Managed Redis service** (DO, Render, etc.) — cleaner but $15+/mo without buying resilience the rest of the stack lacks at our scale.
- **No persistence, in-memory only** — rejected: jobs lost on every deploy / restart.
- **LRU eviction policy** — rejected: silently corrupts BullMQ.
- **Skip Tier B entirely, ride Edge Functions forever** — rejected: Shesa's Finance and Notifications phases produce jobs that demonstrably outgrow Edge Function limits (see [ADR-0032](0032-hybrid-background-jobs.md)).
