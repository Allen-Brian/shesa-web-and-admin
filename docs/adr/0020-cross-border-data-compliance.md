# 0020 — Cross-border data transfer compliance (Cameroon Law 2024/017)

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Shesa processes personal data of Cameroonian members. Our infrastructure is in Frankfurt / Central Europe ([ADR-0016](0016-everything-in-frankfurt.md)), which makes every read and write a cross-border data transfer. Cameroonian **Law No. 2024/017** governs cross-border transfer of personal data; the transition period has ended.

## Decision

- **Obtain authorization from the Cameroonian Personal Data Protection Authority** for cross-border transfer to the EU. This is an active action item with an owner and a (already-passed) deadline.
- **Sign GDPR Data Processing Agreements** with both Supabase and Contabo.
- **TLS in transit everywhere**; encryption at rest (Supabase default).
- **Secrets** in GitHub Actions encrypted secrets and Docker Swarm secrets — never in the repo, images, or env vars.
- **Breach-notification process:** notify the Authority and data subjects as required.
- **Sovereignty caveat:** Supabase is US-incorporated; Contabo is German. Frankfurt solves residency but not sovereignty for the Supabase half (CLOUD Act / Schrems II). Acceptable now; revisit for sensitive financial / KYC data later — an EU-incorporated database host (or self-hosted Supabase on the Contabo VPS) may be warranted.

## Consequences

- Compliance posture is documented and auditable from day one.
- Authority registration must be done before processing in production.
- Vendor changes (e.g. swapping Contabo) trigger DPA re-signing.
- Sensitive data classes (financial records, member PII) may need a different host later, not Supabase.
- Logout flows must purge all client-side caches (TanStack Query, Zustand, IndexedDB) — shared devices are common in Cameroon, and lingering data is its own compliance issue.

## Alternatives considered

- **Host in Cameroon** — rejected: limited managed-service options at our cost target; SLAs uncertain. Revisit when scale and budget allow.
- **Skip the Authority registration** — rejected: legal exposure.
- **EU-incorporated host now** (e.g. Scaleway, Hetzner for Postgres) — considered: more operational work to replace Supabase Auth + Storage + Edge Functions. Revisit when data sensitivity justifies.
