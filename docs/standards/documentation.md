# Documentation strategy (standard)

> **Standard** — how Shesa is documented.
> **Related ADRs:** [0031](../adr/0031-docs-as-markdown-in-repo.md).

How we document the suite so a new developer can get productive without tribal knowledge. The rule behind everything here: **docs live with the code as plain markdown, and are reviewed in the same PR as the change.**

---

## 1. Principles

1. **Docs-as-code.** Documentation lives in the repo as markdown, versioned and reviewed like code. No knowledge trapped in someone's head or a private chat.
2. **Plain markdown — no docs site.** Per [ADR-0031](../adr/0031-docs-as-markdown-in-repo.md), docs are viewed on GitHub. No VitePress, MkDocs, Docusaurus, or GitHub Pages site to maintain.
3. **Layered.** Different docs for different audiences and update rhythms ([§2](#2-the-documentation-layers)). Don't put everything in one giant file.
4. **One source of truth per fact.** A fact is documented in exactly one place; everything else links to it. Duplicated docs rot independently.
5. **Reviewed in the PR.** A change that alters behavior updates its docs in the same PR. "Docs updated?" is a line in the PR template.
6. **Written for the newest person.** If a junior can't follow it without asking, it isn't done ([§4](#4-writing-guidelines-junior-first)).

---

## 2. The documentation layers

| Layer                         | Audience       | Lives in              | Stays current by                              |
| ----------------------------- | -------------- | --------------------- | --------------------------------------------- |
| Decision records (ADRs)       | Devs           | `docs/adr/`           | Written when a significant decision is made   |
| Standards / conventions       | Devs           | `docs/standards/`     | Updated when a convention changes             |
| Setup / onboarding            | New devs       | `docs/onboarding.md`  | Updated whenever setup changes                |
| Data model (curated)          | Devs           | `docs/data-model/`    | Updated when the conceptual model shifts      |
| Runbooks (ops)                | On-call        | `docs/runbooks/`      | Updated after each incident                   |
| Glossary (domain language)    | Everyone       | `docs/glossary.md`    | Updated when a domain term is coined          |
| How-tos                       | Devs           | `docs/how-tos/`       | Updated when a recurring task evolves         |
| Security                      | Devs, on-call  | `docs/security/`      | Updated on every security decision            |
| Roadmap                       | Everyone       | `docs/roadmap.md`     | Updated when the roadmap shifts               |
| READMEs                       | Anyone         | each app / package    | Owned by the maintainer                       |
| Schema reference (live)       | Devs           | Supabase Studio       | Always live — reads the database              |

**The glossary is not optional.** When apps, packages, and design use the same word for the same thing, whole classes of bugs and meetings disappear. One page, definitive, with disambiguation. See [§5](#5-glossary-shape).

---

## 3. Where it lives & how it's published

- **Source of truth:** in-repo. A top-level `docs/` plus a `README.md` in every package and app.
- **No published site.** GitHub renders markdown and Mermaid natively. Anyone who clones the repo has the docs.
- **Schema reference:** Supabase Studio (it shows tables, columns, FKs, RLS policies live).
- **API reference:** there is no separate API — Server Actions are typed functions in `apps/*/`, discoverable by IDE jump-to-definition.
- **Component reference:** shadcn/ui at https://ui.shadcn.com for canonical components; our adaptations are documented inline.

### Diagrams — Mermaid

- Use **Mermaid** (text), committed alongside the docs. GitHub renders them natively.
- For architectural overviews, follow the **C4 model**: Context, Container, Component diagrams.
- **No binary diagram files** (`.drawio` exports, screenshots of diagrams) as source — they drift and can't be reviewed.

---

## 4. Writing guidelines (junior-first)

Write for someone who joined yesterday and has no context.

- **Plain language.** Short sentences. Define every piece of jargon the first time, or link the glossary.
- **Explain the _why_, not just the _what_.** Code shows what; docs exist to capture the reasoning a reader can't recover from the code.
- **Be task-oriented.** Title how-tos by the goal: "How to add a new permission", not "Permission system internals".
- **Show, don't only tell.** A concrete example beats a paragraph of abstraction. Include a real command, a real payload.
- **Active voice, sentence case.** "Run the migration", not "The migration should be run". Headings and labels in sentence case.
- **Assume no tribal knowledge.** If a step needs something installed, say so. If a value comes from somewhere, say where.
- **Link, don't duplicate.** Reference the one source of truth instead of restating it.

**Bad → good**

> **Bad:** "The finance domain emits a payment.recorded event via the outbox which the relay dispatches to the notifications consumer."

> **Good:** "When a member pays a charge, two things happen in one transaction: the payment row is written to `finance.payments`, and a `payment.recorded` event is written to `finance.outbox`. A Database Webhook on the outbox table fires an Edge Function, which sends the receipt and updates the member's balance. The two-row transaction is what guarantees the receipt always sends — a crash between writing the payment and sending the receipt is impossible."

The good version names the actor, the outcome, the mechanism, *and the reason* — in words a new hire understands.

---

## 5. Glossary shape

Every glossary entry has a strict shape so it's actually useful for resolving disputes:

```md
### Term

**One-sentence definition.**

A short paragraph or two explaining the term in context.

**What it is NOT:** disambiguation against near-synonyms. (This is the field most glossaries skip — and it's where the value is.)

**In code:** entity names, key file paths, table names.
```

When introducing a new domain term anywhere (code, doc, ADR), add it to the glossary first. When two terms feel close (e.g. "Branch" vs "Chapter", "Member" vs "Position"), write each entry's "what it is NOT" explicitly referencing the other.

---

## 6. Process — the anti-rot engine

- **Definition of Done includes docs.** A feature isn't done until: public types have TSDoc, new Server Actions are discoverable, behavior changes update the relevant guide, and any significant decision has an ADR.
- **PR template** has a checklist line: _Docs updated? (ADR / README / guide / N/A)_.
- **ADR for significant decisions.** Architecture, a new dependency, a data-model change, a security choice — short, written once. The **body is immutable** once accepted; only the `Status` field flips to `superseded by ADR-XXXX`.
- **Mechanical lint > human checklist** wherever possible:
  - Fail CI if a new `package.json` is added without a `README.md`.
  - Fail CI if a new file in `apps/*/actions/` doesn't export a typed Server Action.
- **Onboarding doc validation:** CI runs a clean-machine setup on every change to setup-affecting files (lockfile, Dockerfiles, `.env.example`, the onboarding doc, CI config), plus a weekly scheduled run as a backstop for environmental drift.
- **Ownership.** Each module's docs are owned by its maintainer. Orphaned docs are deleted, not left to mislead.
- **Quarterly doc sweep** for the manual layers (onboarding, runbooks, glossary).

---

## 7. Templates

- ADR — [`../adr/_template.md`](../adr/_template.md)
- Runbook — [`../runbooks/_template.md`](../runbooks/_template.md)
- How-to — [`../how-tos/_template.md`](../how-tos/_template.md)

### Package README template

```md
# @shesa/<name>

One sentence: what this package is for.

## Responsibilities / Not responsibilities

What belongs here — and what explicitly does not.

## Usage

The 80% example, with real code.

## Local development

How to run, test, and build it.
```
