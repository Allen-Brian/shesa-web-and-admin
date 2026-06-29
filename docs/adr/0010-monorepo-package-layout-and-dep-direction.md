# 0010 — Monorepo package layout & one-way dependency direction

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Without explicit rules, shared packages in a monorepo accrete imports from anywhere — packages import apps, atomic components import domain logic, the dependency graph becomes a cycle factory. The shared library loses its reusability and the apps lose their independence.

## Decision

Define a **strict package map** and enforce a **one-way downward** import direction.

### Apps

| App           | Stack           | Purpose                                                         |
| ------------- | --------------- | --------------------------------------------------------------- |
| `apps/web`    | Next.js         | Public website + CMS                                            |
| `apps/exco`   | React or Next   | Governance dashboard for executive committees                   |
| `apps/finance`| React or Next   | Finance application (charges, payments, treasury, reports)      |
| `apps/connect`| React or Next   | Forums, jobs, achievements, live sessions, polls                |

### Packages

| Package              | Owns                                                                              | Must NOT contain                                |
| -------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| `packages/ui`        | shadcn/ui components (copy-pasted), Tailwind config, shared design tokens         | Domain logic, Supabase imports, app-specific UX |
| `packages/types`     | Cross-package shared domain types (TypeScript)                                    | Runtime code                                    |
| `packages/domain`    | Zod schemas, domain errors, business-rule helpers                                 | UI, Supabase client construction, app code      |
| `packages/supabase`  | Supabase client factories, generated DB types, RLS helper utilities               | UI, domain logic                                |

### Hard rules

- **No package imports an app.** Ever.
- **`packages/ui` must not import** `packages/supabase` or `packages/domain`. It stays presentational; data is passed in as props.
- **`packages/types` imports nothing.** It is the root of the type graph.
- A package may only import packages strictly below it in the graph.
- The **Supabase service-role key is banned everywhere except Server Actions / Route Handlers / Edge Functions.** Browser bundles ship the anon key only; RLS enforces access.

Enforced by `dependency-cruiser` in CI — illegal imports fail the build.

## Consequences

- The shared library stays reusable across all apps without surprises.
- Cyclic dependencies are mechanically impossible.
- New cross-cutting concerns warrant a new package (with an ADR), not a feature added to an unrelated one.
- Adding `dependency-cruiser` adds a CI step (cheap).
- This single rule encodes 80% of SRP and DRY at the package level.

## Alternatives considered

- **Convention only, enforced by review** — rejected: drifts within months.
- **Single package** — rejected: defeats the purpose of a shared library used by multiple apps.
- **Strictly numbered "layers"** — rejected: more rigid than necessary; the directed acyclic graph captures the rule precisely.
