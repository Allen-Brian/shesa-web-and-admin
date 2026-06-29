# Data model

The Shesa Postgres database (on Supabase) is organized as one schema per domain:

| Schema    | Owns                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| `core`    | Identity, members, organizations (Branches, Chapters, Batches, Houses, Sectors), roles & permissions, audit       |
| `finance` | Charges, obligations, payments, ledger, treasury, receipts, expenses, exceptions, currency                        |
| `cms`     | Public website content, articles, pages, branch pages, gallery, albums, Echoes (music), Stream (protected media)  |
| `connect` | Forums, live sessions, polls, jobs, achievements, moderation, presence                                            |

Cross-schema reads go through owned projections or explicit read views, never random cross-schema joins. See [ADR-0003](../adr/0003-schema-per-domain-single-postgres.md).

## Two views of the schema

| View                                | Purpose                                                                                | Source                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Generated** — Supabase Studio     | Exhaustive truth: every table, column, constraint, foreign key, index                  | The live database (open Supabase Studio for the target environment) |
| **Curated** — `erd.md`              | The conceptual mental model used in onboarding and architecture discussions            | Hand-maintained Mermaid in this folder                              |

The generated view physically can't drift because it reads the live schema. The curated view is for _understanding_, not _exhaustiveness_ — don't try to put every table in it.

## When to update

- **Generated:** automatic — reflects the live schema after each migration runs.
- **Curated:** when the conceptual model shifts — a new core entity, a renamed boundary, a deprecated table. Not on every migration.
