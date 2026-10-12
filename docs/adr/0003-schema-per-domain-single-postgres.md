# 0003 — Schema-per-domain on a single PostgreSQL database

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Shesa's domains want strong boundaries — but operating one DB per domain on Supabase would be expensive and complicate cross-domain reads.

## Decision

Use **one PostgreSQL database with one Postgres schema per domain** on Supabase. The eventual layout:

| Schema          | Owns                                                                           | Created in   |
| --------------- | ------------------------------------------------------------------------------ | ------------ |
| `core`          | Identity, members, scopes (org hierarchy), roles & permissions                 | E2 (Phase 0) |
| `audit`         | `audit.audit_entries` (cross-cutting append-only log) + audit helper functions | E4 (Phase 0) |
| `notifications` | Notification events, deliveries, templates, pgmq queue plumbing                | E6 (Phase 0) |
| `finance`       | Charges, obligations, payments, ledger, treasury, exceptions, currency         | Phase 3      |
| `cms`           | Public website, articles, branch pages, gallery, Echoes, Stream                | Phase 5      |
| `connect`       | Forums, live sessions, polls, jobs, achievements, moderation                   | Phase 8      |

**Schemas are created when their owning phase needs them, not upfront.** Pre-creating empty placeholder schemas for downstream phases (a) tempts premature design choices and (b) guarantees rewrites once the owning phase digs in and uncovers real requirements. Each schema's first migration lives in the epic that owns it.

Each domain owns its schema; cross-domain reads go through owned projections or explicit read views — never random cross-schema joins from an unrelated domain.

## Consequences

- One backup, one connection pool, one set of credentials — operationally simple, especially on Supabase's managed Postgres.
- Schema boundaries enforce module ownership at the database level (visible in `\dn` and in Supabase Studio).
- Postgres RLS policies can be authored per schema, matching the ownership boundary.
- In-DB joins within a read model owned by one domain remain fast.
- Cross-domain reads require the owning domain to expose a view or projection — a deliberate seam, not accidental coupling.
- Future split (e.g. moving one domain to its own DB) is mechanically easier: the schema is already isolated.
- **Per-phase creation** keeps each schema's design honest to the work that actually uses it; the schema is born in the migration alongside the tables it holds, not as a hollow `CREATE SCHEMA` waiting to be filled.

## Alternatives considered

- **One DB per domain** — rejected: cost on Supabase, complicates cross-domain reads, complicates auth (each DB has its own credentials).
- **Single shared `public` schema** — rejected: no enforcement of domain ownership; tables from different domains pile up flat.
- **One schema per tenant** (e.g. per Branch) — rejected: schema explosion as the org grows; doesn't match the domain ownership model.
- **Create all schemas upfront in E2** — rejected (per Phase 0 planning revision): pre-committing to a schema before its phase digs in invites rework. Each schema is born with its first real table.
