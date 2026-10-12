# 0004 — Shared Zod schemas validate the client and the server

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Server Actions, Route Handlers, and Edge Functions all need to validate incoming data. Components and forms need the same validation before submit. Maintaining two parallel definitions guarantees drift over time — the canonical bug is "form shape doesn't match server expectation."

## Decision

Author all data shapes (Server Action arguments, form values, Edge Function payloads, webhook bodies) as **Zod schemas in a shared package** (`packages/domain` or similar). Import the same schema on both sides:

- **Forms** parse user input with the schema and surface field errors.
- **Server Actions / Route Handlers** parse `formData` / JSON with the same schema before touching Supabase.
- **Edge Functions** parse their request body with the same schema.

One schema per shape, used by every consumer.

## Consequences

- No shape drift — every entry point validates against the same definition.
- Zod's TypeScript inference gives type-safe parsed values on both sides.
- Generated Supabase row types (`supabase gen types`) describe table shapes; Zod schemas describe the API contract on top of them — different layers, both type-safe.
- Requires the shared package to be a real workspace dependency; nothing redefines schemas locally.
- Schema changes are breaking changes — surface them in the PR description.

## Alternatives considered

- **Hand-written validation per surface** — rejected: guaranteed drift.
- **Generate types from Supabase only, no Zod** — rejected: row types describe DB shape, not the action contract; you still need runtime validation at the boundary.
- **Yup / Joi / Valibot** — rejected: Zod's TypeScript-first DX and ecosystem (shadcn/ui forms, react-hook-form resolver) are dominant.
