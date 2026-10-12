# Archived migrations (2026-06-29 → 2026-09-02)

The 112 migrations that built the schema before the 2026-09-02 squash.

**These no longer run.** The Supabase CLI only reads `*.sql` at the top of
`supabase/migrations/`, so this directory is inert. The live schema is defined by
the three `20260902130*_baseline_*.sql` files one level up.

## Why they are still here

They are the best documentation in the repository. Each one explains _why_ its
change was made — the alternative rejected, the ADR it implements, the incident
that prompted it. The generated baseline cannot carry that; it is
dependency-ordered machine output.

When you need to understand why a table, policy or trigger is shaped the way it
is, `grep` here first.

## Reading them

Ordered by filename. A few landmarks:

| Migration                                     | What it established                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `20260629210215_init_core_permission_checker` | `core.has_permission` — the recursive scope walk every authorization decision funnels through |
| `20260630100639_rls_core`                     | The RLS floor, and why policies calling `has_permission` don't recurse                        |
| `20260702200200_scopes_drop_is_autonomous`    | Autonomy moved from a boolean to `chapter_kind`                                               |
| `20260706100000_init_finance_schema`          | The finance engine — 18 tables in one file                                                    |
| `20260706100100_finance_invariant_triggers`   | Payment and ledger immutability, enforced against _every_ role                                |
| `20260706101000_finance_receipts`             | Receipt tokens + the minimal-disclosure public verify                                         |

## Two things they get wrong

Read with these in mind, because the baseline fixes both and the archived files
still show the broken form:

1. **Seven CMS migrations resolved the Mainstream scope at migration time** and
   raised if it was absent — but no migration creates that scope; it lives only
   in the seed, which the CLI applies _afterwards_. Every fresh database aborted
   at `20260715100000_cms_leadership_schema.sql`, and CI's `db-test` had been
   failing since 15 July. The baseline resolves through
   `core.mainstream_scope_id()` at policy-evaluation time instead.

2. **`pgtap` and `pgmq` were installed unguarded** at positions 4 and 11, so a
   project without either allowlisted lost almost the entire schema. The
   baseline guards both, and only installs pgtap outside production.

## Recovering the old chain

If you ever need to replay history rather than the baseline, move these files
back up one level and delete the baseline files. Nothing else is required —
they were self-sufficient, apart from the two defects above.
