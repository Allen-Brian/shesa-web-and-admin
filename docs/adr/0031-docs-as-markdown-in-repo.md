# 0031 — Docs are plain markdown in the repo; no docs site

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

A documentation site (VitePress, Docusaurus, MkDocs, GitHub Pages) is one more thing to build, configure, host, and keep alive. The borrowed Yimo docs assumed a VitePress site on GitLab Pages with several sibling generated layers (Swagger UI, Storybook, SchemaSpy, TypeDoc). That apparatus is meaningful overhead for a small team. We need anyone who clones the repo to have full access to the docs without depending on an external site.

## Decision

**Docs are plain markdown files in `docs/`, viewed on GitHub.**

- GitHub renders markdown and Mermaid diagrams natively in the browser — no build step.
- Anyone who clones the repo has the docs locally; any editor's markdown preview works.
- No VitePress, Docusaurus, MkDocs, GitHub Pages site, or any other doc publishing pipeline.
- No generated reference layers in this phase:
  - **Schema reference** — use **Supabase Studio** (it shows tables, columns, FKs, RLS policies on the live database).
  - **Component reference** — shadcn/ui components are documented at https://ui.shadcn.com; ours are minor adaptations, documented inline (JSDoc on props) where worth noting.
  - **API reference** — there is no separate API; Server Actions are typed functions in `apps/*/actions/`, discoverable by IDE jump-to-definition. If we ever expose a public API, revisit.

## Consequences

- Docs live with the code, version-control with the code, are reviewed in the same PR. Same docs-as-code principle as the borrowed Yimo strategy, with one fewer moving part.
- Mermaid diagrams stay readable on GitHub; no binary diagram exports.
- Anyone reading on a phone / offline can still consume the docs (markdown is universal).
- No URL to share with non-developers — if a stakeholder needs the docs, they need GitHub access or a one-way exported PDF.
- If the docs grow to the point where in-repo browsing becomes painful (hundreds of files, deep linking, full-text search), revisit and adopt a static-site generator.

## Alternatives considered

- **VitePress (Yimo's choice)** — rejected: more moving parts than a small team needs at this stage.
- **Docusaurus / Nextra / MkDocs** — same rejection.
- **GitHub Pages from the repo's `docs/`** — could be added later as a one-line setting; not needed now.
- **Notion / Confluence** — rejected: two sources of truth that diverge silently; docs drift from code.
