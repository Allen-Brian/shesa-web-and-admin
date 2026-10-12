# 0027 — Shared utility and validation modules

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

As the foundation goes in, two recurring needs surface across every Shesa app: generic helpers (date formatting, currency, slugify) and shared validation schemas (email, UUID, phone, amount) that BOTH the client and Server Actions need.

These can be either separate packages or modules inside `packages/domain`. The choice ripples into the dependency graph defined in [ADR-0010](0010-monorepo-package-layout-and-dep-direction.md).

## Decision

Provide both as **modules inside `packages/domain`** rather than separate packages:

- **`packages/domain/utils`** — generic helpers (date, format, number, string, currency). Pure functions. May be imported by every other package and by Server Actions / Edge Functions.
- **`packages/domain/validators`** — shared Zod schemas (email, UUID, phone, ISO date, URL, amount). Per [ADR-0004](0004-shared-zod-schemas-fe-be.md), the same schemas validate forms AND Server Action inputs.

Reasoning for keeping them inside `packages/domain` rather than as separate packages: at the Shesa team size, package boundary overhead (separate `package.json`, separate publish/install, separate tsconfig) outweighs the SRP benefit. Promote to standalone packages only when a real second consumer outside `packages/domain` justifies it (this is the [Rule of Three](../standards/frontend.md#6-dry--dont-repeat-yourself) for packages, not just for code).

### Cameroon-specific defaults

- `formatCurrency` defaults to **`XAF`** (Central African CFA franc) and **`fr-CM`** (French, Cameroon) — most Shesa members are Cameroon-based.
- `formatDate` defaults to `fr-CM` with French month names.
- `phoneSchema` accepts the Cameroonian formats (`+237` and local `6XXXXXXXX` / `2XXXXXXXX`).

## Consequences

- One canonical place for `formatCurrency` / `formatDate` / `slugify` — no scattered re-implementations.
- One canonical place for `emailSchema` / `uuidSchema` — used by forms AND Server Actions without divergence.
- One fewer workspace package to maintain at startup — easier scaffolding.
- Promotion to standalone packages later is mechanical (move folder, add `package.json`, update imports) — not a one-way door.

## Alternatives considered

- **Separate `packages/utils` and `packages/validators`** — rejected for now: premature package boundary. Revisit when a second consumer (e.g. a future CLI in `apps/cli`) needs them outside `packages/domain`.
- **Inline helpers per app** — rejected: guaranteed divergence within a quarter.
- **Use a third-party validation lib (Yup, Joi, Valibot)** — rejected: Zod is locked by [ADR-0004](0004-shared-zod-schemas-fe-be.md) and pairs cleanly with react-hook-form and shadcn/ui forms.
