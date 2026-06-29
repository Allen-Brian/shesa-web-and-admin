# Architecture Decision Records (ADRs)

An ADR captures a single significant decision: _what we chose, why, what we accept as a trade-off, and what else we considered._

## When to write an ADR

Write one when the decision is:

- **Significant** — architecture, a new dependency, a data-model change, a security choice, a cross-cutting convention.
- **Hard to reverse** — changing it later would cost meaningful work.
- **Non-obvious to a future reader** — the reasoning won't be recoverable from the code alone.

If a future engineer would ask "why did we do it this way?" and the code can't answer, the answer belongs in an ADR.

## How to write one

1. Copy [`_template.md`](_template.md) to `NNNN-short-kebab-title.md` (next number in sequence).
2. Fill in the four sections. Be concrete — name the alternatives, name the trade-offs.
3. Set `Status: accepted` and today's date.
4. Open a pull request.

## Lifecycle

- **The body of an ADR is immutable.** Once accepted, the Context / Decision / Consequences / Alternatives sections are frozen — they are the historical record of the decision _as it was made_.
- **The `Status` field is the only thing that may change** — it flips to `superseded by ADR-XXXX` when a new ADR replaces it.
- Don't edit prior ADR rationale to match new thinking. Write a new ADR that supersedes the old one and explain _why_.

## Relationship to standards

- **Standards** ([`../standards/`](../standards/)) are living — they describe the current state of a convention.
- An **ADR** records _why_ the convention is what it is. A standard may evolve; the ADR that justified it stays put.
