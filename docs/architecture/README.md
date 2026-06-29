# Architecture

The big picture. Read this first when joining the project.

## What lives here

When populated, this folder will contain:

- **overview.md** — narrative summary: what Shesa is, what its boundaries are, how the apps (`web`, `exco`, `finance`, `connect`) and shared packages fit together.
- **c4-context.md** — C4 Level 1: Shesa in its environment (members, MTN/Orange Mobile Money, Supabase, external systems).
- **c4-containers.md** — C4 Level 2: the apps, Supabase Postgres, Supabase Auth, Supabase Storage, Edge Functions, the Contabo VPS, Cloudflare edge.

Per-module Component diagrams (C4 Level 3) live in the relevant [`docs/standards/`](../standards/) doc or `apps/<app>/docs/`, near the code they describe.

## Source format

All diagrams are **Mermaid** (text), committed alongside the docs. They diff in pull requests and render natively on GitHub. **Binary diagram files** (`.drawio` exports, screenshots of diagrams) as the source are not allowed — they drift and can't be reviewed.

## Updating

When the system shape changes (new container, new boundary, new external system), update the relevant diagram in the same pull request. If the change deserves its own decision record, write an ADR in [`docs/adr/`](../adr/) and link to it from the diagram caption.
