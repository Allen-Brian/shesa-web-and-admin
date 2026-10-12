# 0034 — pgTAP for database-level tests

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

A large fraction of Shesa's correctness sits in the database itself rather than in TypeScript:

- **RLS policies** decide who can read or write every row in `core.*`, `audit.*`, `notifications.*` — a misplaced `USING (true)` is a data breach.
- **`core.has_permission()`** is the single source of truth for authorization decisions. It runs inside RLS policies, so a bug here cascades into every read/write across the platform.
- **Triggers** like `core.role_assignments_audit` mirror changes into `core.role_history` and `audit.audit_entries` automatically. If the trigger fails, the audit trail vanishes silently.
- **Append-only enforcement** on `audit.audit_entries` and `core.role_history` is a SQL trigger that raises on UPDATE/DELETE. The trigger itself needs a test.

Verifying any of these from TypeScript means spinning up the whole API surface (Supabase Auth, JWTs, role-switching) just to assert "the function returns FALSE." That's slow, brittle, and skips the most direct way to test: a SQL query that ASSERTS the answer.

The Phase 0 spec §20 already calls for "RLS prevents unauthorized reads/writes, permission checker returns false for expired role, audit table is append-only" as database-level tests. We need a runner that speaks SQL natively.

## Decision

**Use [pgTAP](https://pgtap.org) for every test that lives in the database** — RLS policies, security-definer functions, triggers, append-only constraints, scope ancestry traversal.

- Tests live in **`supabase/tests/<name>.test.sql`**. Each file is wrapped in `BEGIN; … ROLLBACK;` so test data never leaks between runs.
- The CLI runner is **`supabase test db`** (which uses `pg_prove` under the hood). Aliased as **`pnpm db:test`** in the root `package.json`.
- The `pgtap` extension is installed via migration in its own `pgtap` schema (per Supabase's recommended layout), so it's reproducible across local, staging, and prod databases.
- Each test file declares its expected count with `SELECT plan(N);` and finishes with `SELECT * FROM finish();` — TAP output is machine-readable and CI-friendly.
- **`db:test` is a required status check on `develop` and `master`** (the gating for E13's CI). RLS / permission-checker correctness is the highest-risk surface in Phase 0 — a green pipeline with red database tests is the exact failure mode this rule exists to prevent.

## Consequences

- DB invariants get the same "fails CI, fails the merge button" treatment as TypeScript type errors. RLS bugs cannot ship silently.
- Test feedback is fast — local pgTAP runs against a local Supabase in ~1 second per file, no app servers needed.
- Tests are version-controlled SQL — diffable, reviewable in PRs, and the assertion language is the same as the code under test (SQL).
- Writing SQL tests requires a different skill than writing Vitest — junior devs may need pairing on their first pgTAP file. Mitigated by keeping each test small and using the patterns established in E4 (the first epic that lands pgTAP tests).
- pgTAP's assertion vocabulary (`ok`, `is`, `throws_ok`, `results_eq`, etc.) is small; the cost to learn is hours, not days. The Phase 0 docs include the patterns we'll reuse.
- Test fixtures (sample users, scopes, role assignments) build on top of `supabase/seed.sql` plus per-test `INSERT`s inside the transaction — rolled back at the end, so seed state stays stable across test runs.

## Alternatives considered

- **Plain `psql` assertions** — works for one-off checks but no per-test isolation, no TAP output, no parallelizable runner. Useful for manual exploration; not a test framework.
- **TypeScript integration tests against a live local Supabase** (Vitest + `@supabase/supabase-js`) — possible, but every test has to handle Supabase Auth setup, JWT minting, and role switching. Three layers of indirection between "I want to assert this RLS rule" and the actual assertion. Wrong tool for testing the DB.
- **pg-prove without pgTAP (plain TAP via SQL `SELECT 'ok 1'` etc.)** — gets you the TAP runner but loses the assertion library. The point of pgTAP is the assertions (`throws_ok`, `is`, `policies_are`, etc.).
- **Skip DB-level tests, rely on app-level integration tests** — rejected: see the context. RLS bugs would only surface when an integration test happens to hit the wrong row, not when the policy is written wrong.
- **dbatu / sql-test / other newer SQL test frameworks** — pgTAP has the broadest install base in the Postgres ecosystem, is bundled in Supabase's Docker image, and has CI runners (`pg_prove`) that have been stable for a decade. Newer frameworks would buy nothing for the cost of being less standard.
