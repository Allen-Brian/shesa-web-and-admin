# Shesa docs

The single source of truth for how Shesa is designed, built, and operated. Everything here ships in the repo and is reviewed in the same pull request as the code it documents.

## Layers

| Folder                         | What it holds                             | When to read                                             | When to update                              |
| ------------------------------ | ----------------------------------------- | -------------------------------------------------------- | ------------------------------------------- |
| [architecture/](architecture/) | C4 diagrams + narrative overview          | First day; when joining a new module                     | When the system shape changes               |
| [adr/](adr/)                   | Architecture Decision Records — _why_     | When you don't understand why something is the way it is | When making a significant decision          |
| [standards/](standards/)       | Living conventions — _how_                | While writing code                                       | When a convention changes                   |
| [runbooks/](runbooks/)         | Step-by-step ops procedures               | When something breaks or you're deploying                | After every incident                        |
| [data-model/](data-model/)     | Curated ERD + pointers to schema docs     | When designing a feature that touches the DB             | When the data model shifts                  |
| [security/](security/)         | Security model, threats, mitigations      | When touching auth, payments, or PII                     | When a security decision is made            |
| [how-tos/](how-tos/)           | Task-oriented guides ("how do I add X")   | When you need to do a specific thing                     | When you discover a recurring task          |
| [glossary.md](glossary.md)     | Domain language — _what does X mean here_ | Whenever you see a term you're not sure about            | When you coin or refine a domain term       |
| [onboarding.md](onboarding.md) | New-dev setup                             | First day                                                | Whenever setup changes                      |
| [phase-0/](phase-0/)           | What Phase 0 shipped + how to use it      | After scaffolding is done, before Phase 1                | Only if Phase 0 deliverables shift          |
| [product/](product/)           | Feature-level entity & pages specs        | Before implementing a new feature or view                | When product intent for an entity is locked |
| [roadmap.md](roadmap.md)       | The phased build plan                     | When planning what to work on next                       | When the roadmap shifts                     |

## How to read these docs

These docs are written **for the newest person on the team**. If something is unclear, that's a bug in the doc — open an issue or fix it in your next pull request. See [standards/documentation.md](standards/documentation.md) for the writing rules.

## How docs are published

**They aren't.** Docs are plain markdown in the repo. Anyone who clones the repo has full access; GitHub renders markdown and Mermaid diagrams natively in the browser. No VitePress, MkDocs, Docusaurus, or GitHub Pages site to maintain.

If you need to read the docs locally, your editor's markdown preview will do.
