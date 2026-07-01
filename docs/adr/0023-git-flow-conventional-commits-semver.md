# 0023 — Git flow + Conventional Commits + monorepo-wide SemVer

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Git history, branching, and versioning either are a tool (clean bisects, automated changelogs, predictable releases) or a tax (mystery merge commits, unclear release boundaries). Picking conventions late means refactoring history.

## Decision

- **Hosting:** **GitHub.**
- **Branch model:** `master` (production, protected) ← `develop` (integration / staging, protected) ← `<type>/<scope>-<desc>` (short-lived). No `release/*` branches.
- **Merge strategy:** feature → `develop` is **squash merge** (PR title = the squash commit). `develop` → `master` is a **merge commit** + SemVer tag.
- **Versioning:** **monorepo-wide SemVer tag per release on `master`** (`vMAJOR.MINOR.PATCH`). Packages are internal workspace deps (not published); revisit `changesets` only if shared packages are ever published externally.
- **Commits: Conventional Commits** with a **required scope** from a locked enum (`scope-empty: 'never'`; repo-wide changes use the `repo` scope).
- **Hotfix:** branch from `master` → PR to `master` → tag → back-merge / cherry-pick to `develop`.

### Commit scope enum

**Apps:** `web`, `exco`, `finance`, `connect`
**Domains** (per the schema split): `core`, `finance-domain`, `cms`, `connect-domain`
**Shared packages:** `ui`, `types`, `domain`, `supabase`
**Infra / meta:** `config`, `infra`, `ci`, `docs`, `deps`
**Repo-wide catch-all:** `repo`

(Note: `finance` is an app; `finance-domain` is the backend schema/domain. Same for `connect` / `connect-domain`. The split avoids ambiguity in commit history.)

Enforced by `commitlint` + `husky` + `lint-staged` + GitHub Actions. Full conventions in [`docs/standards/git-conventions.md`](../standards/git-conventions.md).

## Consequences

- `develop` history is one clean commit per feature — clean bisects, machine-readable for changelog generation.
- Area is legible from the commit scope (no extra metadata needed).
- Image tags per release support one-action rollback via Docker Swarm.
- All devs must use the commit format (`commitizen` helps juniors).
- Configuring GitHub's squash-commit-message template is required, or squashes lose the clean message.

## Alternatives considered

- **GitLab** — considered but the user chose GitHub for ecosystem alignment (Supabase, Vercel, GitHub Actions, ghcr.io).
- **GitFlow with `release/*` branches** — rejected: `develop` already plays the integration role; release branches are duplicate state without a stabilization need.
- **Merge commits to `develop`** — rejected: noisy history that needs the PR view to read.
- **CalVer** — rejected: SemVer signals breakage for the (eventual) externally-consumed packages.
- **Per-package versioning via `changesets`** — deferred: only earns its keep if shared packages are published externally.
- **`scope-empty` allowed** — rejected: throws away the area signal.
