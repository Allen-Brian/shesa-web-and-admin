# 0003 — Schema-per-domain on a single PostgreSQL database

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Shesa's domains (Core, Finance, CMS, Connect) want strong boundaries — but operating one DB per domain on Supabase would be expensive and complicate cross-domain reads.

## Decision

Use **one PostgreSQL database with one Postgres schema per domain** on Supabase:

| Schema    | Owns                                                                            |
| --------- | ------------------------------------------------------------------------------- |
| `core`    | Identity, members, organizations, roles & permissions, audit                    |
| `finance` | Charges, obligations, payments, ledger, treasury, exceptions, currency          |
| `cms`     | Public website, articles, branch pages, gallery, Echoes, Stream                 |
| `connect` | Forums, live sessions, polls, jobs, achievements, moderation                    |

Each domain owns its schema; cross-domain reads go through owned projections or explicit read views — never random cross-schema joins from an unrelated domain.

## Consequences

- One backup, one connection pool, one set of credentials — operationally simple, especially on Supabase's managed Postgres.
- Schema boundaries enforce module ownership at the database level (visible in `\dn` and in Supabase Studio).
- Postgres RLS policies can be authored per schema, matching the ownership boundary.
- In-DB joins within a read model owned by one domain remain fast.
- Cross-domain reads require the owning domain to expose a view or projection — a deliberate seam, not accidental coupling.
- Future split (e.g. moving one domain to its own DB) is mechanically easier: the schema is already isolated.

## Alternatives considered

- **One DB per domain** — rejected: cost on Supabase, complicates cross-domain reads, complicates auth (each DB has its own credentials).
- **Single shared `public` schema** — rejected: no enforcement of domain ownership; tables from different domains pile up flat.
- **One schema per tenant** (e.g. per Branch) — rejected: schema explosion as the org grows; doesn't match the domain ownership model.
