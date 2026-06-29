# 0016 — Everything in Frankfurt / Central Europe (Supabase + Contabo)

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

The hot path in Shesa is **Next.js app on the Contabo VPS → Supabase Postgres**. If those two are in different regions, every Server Action and every TanStack Query hits cross-region latency. Cameroon is far from any major cloud region, so the choice of _which_ region matters less than ensuring the app and the database are co-located.

## Decision

**Supabase Postgres and the Contabo VPS both sit in Central Europe** (Frankfurt area, `eu-central-1` for Supabase; Contabo's German or Nuremberg data center for the VPS). Cross-region placement is **forbidden**.

Specifically:

- **Database, Auth, Storage:** Supabase project in `eu-central-1` (Frankfurt).
- **Compute (Next.js apps in Docker Swarm):** Contabo VPS in Germany.
- **Edge Functions:** Supabase decides their placement; we rely on Supabase's globally distributed Deno deploy and accept the trade-off (cold-start in random regions in exchange for global proximity to webhook senders).
- **Cloudflare** in front of the VPS handles user-facing latency for static assets and images at the African edge.

## Consequences

- Server Action → Supabase Postgres hops are local (~5–20ms intra-region) — no cross-region latency tax.
- Cloudflare's African edge handles the user-facing latency for static assets and any cacheable Next responses.
- One region to monitor, one set of compliance considerations.
- Frankfurt isn't ideal for African users on the request path; the frontend network conventions (caching, prefetching, lean payloads, optimistic updates) mitigate this. See [`frontend-network.md`](../standards/frontend-network.md).
- Frankfurt solves data **residency** but not **sovereignty** (CLOUD Act / Schrems II — Supabase is US-incorporated; Contabo is German). Acceptable now; revisit for sensitive financial / KYC data later. See [ADR-0020](0020-cross-border-data-compliance.md).

## Alternatives considered

- **US region** — rejected: worse latency for African users; worse sovereignty story.
- **South Africa region (AWS Cape Town)** — closer to users but Supabase doesn't offer it; would require self-hosting Supabase or splitting vendors.
- **Self-hosted Supabase in Cameroon** — rejected: limited managed-service options at our cost target; SLAs uncertain. Revisit when scale justifies.
- **Multi-region** — premature optimization for the current scale.
