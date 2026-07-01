# Git conventions (standard)

> **Standard** — branches, commits, releases, the GitHub pull-request flow.
> **Related ADRs:** [0023](../adr/0023-git-flow-conventional-commits-semver.md).

How we name branches and write commits. Enforced by tooling ([§6](#6-enforcement)) so the rules can't quietly rot.

---

## 1. Branch model

| Branch                  | Role             | Protected     | Deploys to |
| ----------------------- | ---------------- | ------------- | ---------- |
| `master`                | Production       | yes (PR-only) | production |
| `develop`               | Integration      | yes (PR-only) | staging    |
| `<type>/<scope>-<desc>` | Short-lived work | no            | —          |

- Feature / fix branches are cut from **`develop`** and merged back into `develop`.
- Only `develop` may PR into `master` (the production promotion).
- Hotfixes are the exception: cut from **`master`**, merged to `master`, then back-merged (or cherry-picked) into `develop` so the two never diverge.
- A branch is **deleted on merge** and holds **one concern** only.
- **No `release/*` branches.** `develop` IS the integration / staging branch; promotion is `develop → master` and that IS the release.

---

## 2. Branch naming

```
<type>/<scope>-<short-kebab-description>
```

- Lowercase, kebab-case, short, no spaces.
- `<scope>` = the package or domain (same list as commit scopes, [§3](#3-commit-messages--conventional-commits)).
- Reference the GitHub issue in the PR description (GitHub links it automatically). If you prefer the id in the branch: `<type>/<issue-id>-<scope>-<desc>`.

| Branch                            | Means                                    |
| --------------------------------- | ---------------------------------------- |
| `feat/finance-charge-create`      | New charge-create feature in finance app |
| `fix/ui-button-disabled-state`    | Bug fix in the shared Button             |
| `refactor/core-membership-status` | Refactor membership status enum          |
| `chore/ci-turbo-cache`            | CI tweak                                 |
| `docs/adr-tenancy-model`          | An ADR                                   |
| `hotfix/payment-double-record`    | Urgent fix off `master`                  |

Branch types mirror the commit types: `feat`, `fix`, `hotfix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`, `build`.

Keep your branch current by **rebasing your own feature branch onto `develop`** before opening the PR. Never rebase shared branches (`develop`, `master`).

---

## 3. Commit messages — Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

`feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `style`, `revert`.

**`chore` vs `build` vs `ci` — pinned definitions:**

- **`build`** — changes to the build system or build-affecting dependencies: Next config / tsconfig / Turborepo, the bundler, a dep bump that changes build output. Test: _affects how it's built_.
- **`ci`** — changes to the pipeline itself: `.github/workflows/`, deploy scripts, CI-only tooling. Test: _affects the pipeline_.
- **`chore`** — housekeeping that touches neither runtime/test behavior nor build/ci.
- Dependency bumps: routine → `chore(deps)`; build-affecting → `build(deps)`.

### Scope (enum — one of)

**Apps:**

- `web`, `auth`, `exco`, `finance`, `connect`

**Domains** (matching the schema split):

- `core`, `finance-domain`, `cms`, `connect-domain`, `audit`, `notifications`

(The `-domain` suffix on `finance-domain` / `connect-domain` disambiguates from the `finance` / `connect` apps. `audit` and `notifications` schemas have no app counterpart so they don't need the suffix.)

**Shared packages:**

- `ui`, `types`, `domain`, `supabase`, `config`, `eslint-config`, `tsconfig`

(`config` is the runtime config package — env validation, public URL helpers. Use the `infra` scope below for build-tool config edits like turbo.json or root tsconfig.)

**Infra / meta:**

- `infra`, `ci`, `docs`, `deps`

**Repo-wide catch-all:**

- `repo` — for genuinely cross-cutting changes that touch no specific area

**Scope is required** (`scope-empty: [2, 'never']` in commitlint). A scopeless commit throws away the area signal — for repo-wide changes use `repo`; never leave blank.

### Subject line

- Imperative mood: "add", not "added" or "adds".
- Lowercase, no trailing period, ≤ ~50 characters.

### Body (optional)

- Explain the **why**, not the what — the diff already shows the what.
- Blank line after the subject; wrap at ~72 characters.

### Footer (optional)

- `Closes #123` / `Refs #123` to link and auto-close GitHub issues on merge.
- `BREAKING CHANGE: <what broke and the migration>` — or a `!` after the type/scope (`feat(finance-domain)!:`) — for breaking changes.

### Atomic commits

One logical change per commit. Granular commits on a feature branch are encouraged; the squash at PR merge collapses them.

### Good

```
feat(finance): add manual cash payment recording
fix(ui): keep icon when Button renders as a Next Link
refactor(core): split membership status into typed enum
chore(deps): bump @supabase/ssr to 0.5
build(deps): bump next to 15 — build output changed
feat(finance-domain)!: switch obligations to proration model
```

### Bad → why

```
fixed stuff                                     → no type/scope, past tense, vague
WIP                                             → not atomic or meaningful
Update                                          → says nothing
feat(finance): Added charges and fixed buttons  → multiple concerns, past tense, capitalized
```

---

## 4. Merge strategy & releases

- **Feature → `develop`: squash merge.** The PR title (in conventional format) becomes the single squash commit, so `develop` history is one clean commit per feature. Requires a green pipeline + reviewer approval; source branch auto-deleted.
- **`develop` → `master`: merge commit** at a production release, then **tag `master`**.
- **Tags: SemVer** `vMAJOR.MINOR.PATCH` (feature → minor, fix → patch, breaking → major).
- **One monorepo-wide tag per release.** Packages are internal workspace deps (not published to a registry); apps deploy as a set; tag ties cleanly to image-tag rollback.
- Hotfix: PR into `master`, tag a patch, then merge / cherry-pick back to `develop`.

Optional automation (later): Conventional Commits feed a changelog generator and auto version bumps.

---

## 5. Linking work

- Put `Closes #<issue>` in the commit / PR description so merging to the default branch closes the GitHub issue automatically.
- PR title follows the same conventional format (it becomes the squash commit) and carries the "Docs updated?" checklist line from the [documentation standard](documentation.md).

---

## 6. Enforcement

| Rule                                   | Tool                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Commit message format                  | `@commitlint/cli` + `@commitlint/config-conventional` + the scope enum below |
| Run commitlint on every commit         | `husky` `commit-msg` hook                                                    |
| Lint / format / typecheck staged files | `husky` `pre-commit` + `lint-staged`                                         |
| Branch name format                     | a `pre-push` (or CI) regex check                                             |
| Block bad messages in CI               | a `lint:commits` GitHub Actions job on every PR                              |
| Help juniors write valid messages      | `commitizen` (`git cz`) interactive prompt                                   |

GitHub repo settings to switch on: squash merge as default, require PR review, require status checks (CI), require branches to be up to date, delete source branch on merge, auto-close linked issues.

`commitlint` config:

```js
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        // apps
        'web',
        'auth',
        'exco',
        'finance',
        'connect',
        // domains (schema-aligned)
        'core',
        'finance-domain',
        'cms',
        'connect-domain',
        'audit',
        'notifications',
        // shared packages
        'ui',
        'types',
        'domain',
        'supabase',
        'config',
        'eslint-config',
        'tsconfig',
        // infra / meta
        'infra',
        'ci',
        'docs',
        'deps',
        // repo-wide catch-all
        'repo',
      ],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 72],
  },
};
```

---

## 7. Cheat sheet

```
Branch:  <type>/<scope>-<desc>        feat/finance-charge-create
Commit:  <type>(<scope>): <subject>   feat(finance): add manual cash payment recording
Flow:    branch off develop → PR → squash-merge → develop→master = release
Hotfix:  branch off master → PR → tag → merge back to develop
Rebase:  your own branch onto develop; never develop/master
```
