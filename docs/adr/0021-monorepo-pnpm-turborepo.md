# 0021 — Monorepo tooling: pnpm workspaces + Turborepo

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Shesa is a monorepo of four apps (`web`, `exco`, `finance`, `connect`) and shared packages (`ui`, `types`, `domain`, `supabase`). Package managers and build orchestrators differ in install speed, disk footprint, workspace ergonomics, and CI cache behavior. The choice ripples into every CI step, every dev's first install, and the speed of every build.

## Decision

- **Package manager:** **pnpm workspaces.**
- **Build orchestrator:** **Turborepo** (run-only-affected, remote caching).
- **TypeScript strict mode** project-wide (`tsc --noEmit` in CI).
- **Shared configs in `packages/config`** (or co-located at the repo root) — ESLint, Prettier, tsconfig.

## Consequences

- Fast installs and small disk footprint (pnpm's content-addressable store).
- CI runs only what changed (`turbo run build --filter=[origin/develop]`) — fast PR checks even as the monorepo grows.
- Strict TypeScript catches type drift early — important when Supabase generated types refresh after a migration.
- One config package per concern keeps lint / format / TS consistent across apps.
- Engineers must have pnpm and the right Node version pinned (Volta / mise / `.nvmrc` — decided when scaffolding).

## Alternatives considered

- **npm workspaces** — rejected: slower installs, less mature workspace ergonomics.
- **yarn (classic or berry)** — rejected: berry's PnP is too disruptive; classic is feature-frozen.
- **Nx** — considered: more featureful than Turbo but heavier; Turbo's affected-only model + remote cache is enough for our scale.
- **Plain pnpm workspaces (no Turbo)** — rejected: leaves affected-only and remote caching on the table.
