# Standards

Living conventions for how Shesa is built. Updated as patterns evolve. For the _why_ behind each, see [`../adr/`](../adr/).

## Contents

- **documentation.md** — how we write and maintain docs (this very system)
- **git-conventions.md** — branches, commits, releases, the GitHub pull-request flow
- **frontend.md** — package map, dependency direction, naming, React/Next + Tailwind + shadcn/ui conventions
- **frontend-network.md** — TanStack Query + Zustand, Supabase client, interceptors, idempotency, caching, offline
- **backend.md** — Supabase + Server Actions / RLS / Edge Functions, validation, errors, events, auth model
- **infra-devops.md** — Supabase Cloud + Contabo VPS + Docker Swarm + Cloudflare + GitHub Actions

## Reading order for a new dev

1. [git-conventions.md](git-conventions.md) — how to commit and open a pull request
2. [documentation.md](documentation.md) — how to write docs as you go
3. The standards for the area you're working in: [frontend.md](frontend.md), [frontend-network.md](frontend-network.md), [backend.md](backend.md), or [infra-devops.md](infra-devops.md)

## Updating a standard

When a convention changes, update the standard in the same PR as the code change. Orphaned standards are deleted, not left to mislead.
