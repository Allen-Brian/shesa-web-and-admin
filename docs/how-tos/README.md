# How-tos

Task-oriented guides. Titled by the goal you have, not the system internals.

## Contents

_(Populated as recurring tasks emerge during the build. Initial how-tos will land in Phase 0 alongside the monorepo scaffolding.)_

Expected initial how-tos:

- **local-dev-setup.md** — getting Shesa running locally (Supabase CLI + the Next.js / React apps).
- **add-a-shadcn-component.md** — adding a shadcn/ui component to `packages/ui`.
- **add-a-supabase-migration.md** — authoring and applying a database migration.
- **add-an-edge-function.md** — adding a Supabase Edge Function (webhook receiver, scheduled job).
- **add-an-adr.md** — proposing and merging an Architecture Decision Record.

## Writing a how-to

1. Copy [`_template.md`](_template.md).
2. Title it by the **goal** — "How to add a new permission" beats "Permission system internals".
3. Include prerequisites, numbered steps, a "verify it worked" check, and links to related docs.
4. Show real commands and real payloads, not abstractions.
