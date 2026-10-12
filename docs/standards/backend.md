# Backend conventions (standard)

> **Standard** — Shesa's "backend" is Supabase + Next.js Server Actions / Route Handlers + Supabase Edge Functions. There is no separate Node API.
> **Related ADRs:** [0003](../adr/0003-schema-per-domain-single-postgres.md), [0005](../adr/0005-inter-module-communication.md), [0006](../adr/0006-casl-for-authorization.md), [0008](../adr/0008-transactional-outbox.md), [0009](../adr/0009-standardized-error-envelope.md), [0019](../adr/0019-supabase-auth-nestjs-authorization.md), [0030](../adr/0030-supabase-as-baas-with-server-actions.md), [0032](../adr/0032-hybrid-background-jobs.md).

How server-side code is structured, where each concern lives, and the rules that keep the Supabase-only model from rotting into spaghetti.

---

## 1. Architecture

- **Data:** Supabase Postgres, **schema per domain** (`core`, `finance`, `cms`, `connect`) — see [ADR-0003](../adr/0003-schema-per-domain-single-postgres.md).
- **Auth:** Supabase Auth (authentication). RLS + a policy module (authorization). See [ADR-0019](../adr/0019-supabase-auth-nestjs-authorization.md), [ADR-0006](../adr/0006-casl-for-authorization.md).
- **Storage:** Supabase Storage for media (member photos, CMS images, attachments).
- **Server-side code:**
  - **Next.js Server Actions / Route Handlers** for app-driven mutations (the bulk of the work).
  - **Supabase Edge Functions** (Deno) for webhook receivers (MTN MoMo, Orange Money), scheduled tasks via pg_cron, and Database Webhook consumers.
  - **Node worker container** (added later when jobs outgrow Edge Functions) — see [ADR-0032](../adr/0032-hybrid-background-jobs.md).

---

## 2. The locked decisions

| #   | Decision           | Concretely                                                                                                                                                                      |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Data access        | **supabase-js** with generated types (`supabase gen types`). No ORM, no Kysely, no PostgREST wrapper.                                                                           |
| 2   | Validation         | **Zod** schemas shared by client forms and Server Actions (`packages/domain/validators/`). See [ADR-0004](../adr/0004-shared-zod-schemas-fe-be.md).                             |
| 3   | Inter-domain calls | Through **public helpers** in `packages/domain/<domain>/`; cross-domain side effects via **outbox events**. See [ADR-0005](../adr/0005-inter-module-communication.md).          |
| 4   | Authorization      | **RLS as primary**, **policy module** in Server Actions as second layer. See [ADR-0006](../adr/0006-casl-for-authorization.md).                                                 |
| 5   | Org model          | **Hierarchy of org nodes** (Branch → Chapter → Batch → House → Sector) with scoped role / flag / position grants. See [ADR-0007](../adr/0007-tenancy-model-orgs-and-grants.md). |
| 6   | Reliability        | **Transactional outbox** for cross-domain side effects. See [ADR-0008](../adr/0008-transactional-outbox.md).                                                                    |

---

## 3. Layering inside a Server Action

A Server Action goes through the same steps every time, in this order:

```ts
'use server';

export async function createCharge(formData: FormData) {
  // 1. Parse + validate input with Zod
  const input = createChargeSchema.parse(Object.fromEntries(formData));

  // 2. Resolve the caller's session
  const supabase = createServerClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();

  // 3. Load the member's effective permissions (from the policy module)
  const member = await loadMember(supabase, user.id);
  if (!policy.can(member, 'charge.create', { branchId: input.branchId })) {
    throw new ForbiddenError('charge.create', { branchId: input.branchId });
  }

  // 4. Run the business change INSIDE a transaction with the outbox insert
  const result = await chargeService.create(supabase, input, { actor: member });

  // 5. Revalidate any cached paths / tags
  revalidateTag(`branch-${input.branchId}-charges`);

  return result;
}
```

Each step is mandatory for any mutating action. The error envelope ([ADR-0009](../adr/0009-standardized-error-envelope.md)) is produced by a top-level error boundary that maps thrown domain errors to the standard shape.

---

## 4. Where things live

| Layer                         | Lives in                             | Does                                                               | Never does                                                                 |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Server Action / Route Handler | `apps/<app>/app/.../actions.ts`      | Validates input, calls policy, calls a service, returns a response | Direct table writes, raw supabase-js calls without going through a service |
| Edge Function                 | `supabase/functions/<name>/index.ts` | Webhook receivers, scheduled jobs, Database Webhook consumers      | App-facing CRUD (use Server Actions for that)                              |
| Service                       | `packages/domain/<domain>/services/` | Business logic; transactions; emits outbox events                  | HTTP / Next concerns; cross-domain table access                            |
| Repository (thin)             | `packages/domain/<domain>/repos/`    | supabase-js calls scoped to one domain; returns domain types       | Business logic; cross-domain knowledge                                     |
| Policy                        | `packages/domain/policy/`            | `can(member, action, resource)`                                    | Domain logic                                                               |
| Validators                    | `packages/domain/validators/`        | Zod schemas for inputs                                             | Side effects                                                               |
| Generated DB types            | `packages/supabase/types.gen.ts`     | Row + table types                                                  | Hand-edited (regenerated by `supabase gen types`)                          |

The "repository" layer is **thin** — supabase-js is already a typed query builder, so the repo is mostly a place to keep the queries grouped by domain and add domain-type mapping if needed.

---

## 5. Validation & responses

- **Inputs:** parsed with Zod at the top of every Server Action / Edge Function. Failures throw a `ValidationError` mapped to the error envelope.
- **Outputs:** explicit return types — never just `return rows`. If a domain has private vs public fields (e.g. CMS draft vs published), the public Server Action only returns the public fields.

---

## 6. Errors

One error envelope, applied uniformly:

```json
{ "status": 422, "code": "MEMBER_NOT_FOUND", "message": "...", "traceId": "...", "fields": {} }
```

See [ADR-0009](../adr/0009-standardized-error-envelope.md). Domain errors are typed (`MemberNotFoundError`, `InsufficientBalanceError`, etc.). The top-level error boundary maps them.

---

## 7. Outbox / cross-domain side effects

Cross-domain side effects use the outbox pattern ([ADR-0008](../adr/0008-transactional-outbox.md)):

```
finance.recordPayment(...)
  TX: insert into finance.payments
      insert into finance.outbox (event: 'payment.recorded', payload: {...})
  COMMIT
→ Database Webhook → Edge Function → side effects (receipt, notification, balance update)
```

Event names: past tense, namespaced — `member.transferred`, `charge.generated`, `payment.recorded`.

---

## 8. Authorization model

- **RLS first.** Every table has RLS enabled. Policies reference Supabase Auth's `auth.uid()` plus the member's role / position rows.
- **Policy module second.** Server Actions and Edge Functions call `policy.can(member, action, resource)` before mutating — to return clean error envelopes and to enforce checks for actions RLS can't express cleanly.
- **Service-role key bypasses RLS.** Used only when policy explicitly approves a privileged action (e.g. a recurring-charge cron run that acts on behalf of an admin role).

See [ADR-0006](../adr/0006-casl-for-authorization.md), [ADR-0007](../adr/0007-tenancy-model-orgs-and-grants.md), [ADR-0019](../adr/0019-supabase-auth-nestjs-authorization.md).

---

## 9. Background jobs

See [ADR-0032](../adr/0032-hybrid-background-jobs.md). Two tiers:

- **Tier A (now):** Supabase pg_cron + Edge Functions.
- **Tier B (later):** Node worker on the Contabo VPS with BullMQ + Redis, when a job class outgrows Edge Function limits.

Idempotency on retried jobs ([ADR-0015](../adr/0015-idempotency-keys-mandatory.md)) is mandatory.

---

## 10. Migrations

- **All schema changes** are SQL migrations versioned with the Supabase CLI (`supabase migration new …`).
- **Expand-contract discipline** — additive first, drop later.
- **`CREATE INDEX CONCURRENTLY`** for any index added to a non-trivial table in prod.
- **No manual DB edits** in staging or production.
- **RLS policies** migrate alongside the tables they protect.
- **`supabase gen types`** runs after every migration; generated types are committed.

---

## 11. Naming

| Thing                     | Convention                                    | Example                             |
| ------------------------- | --------------------------------------------- | ----------------------------------- |
| Schema                    | one word, lowercase                           | `finance`                           |
| Table                     | snake_case, plural                            | `finance.charges`                   |
| Server Action file        | `<entity>-actions.ts`, kebab-case             | `charge-actions.ts`                 |
| Edge Function folder      | kebab-case                                    | `supabase/functions/momo-webhook/`  |
| Edge Function action file | kebab-case verb-resource                      | `record-manual.ts`, `grant-role.ts` |
| Service                   | PascalCase class or `chargeService` namespace | `ChargeService.create()`            |
| Domain event              | past tense, namespaced                        | `payment.recorded`                  |
| Permission                | `resource.action`, lowercase                  | `charge.create`                     |
| Repository method         | intention-revealing                           | `findMemberById`, `insertCharge`    |
| Error code                | SCREAMING_SNAKE                               | `MEMBER_NOT_FOUND`                  |

A filename must say what the file is without its directory — see
[frontend.md §5.1](./frontend.md#51-the-rule-that-matters), which applies to
every workspace, not just the React side. Bare `actions.ts` is no longer
acceptable; it was the convention that let nineteen unrelated modules share
one name.

### Reaching a non-`public` schema

Every supabase-js call against `core`, `finance`, `cms`, `exco`, `notifications`
or `audit` **must** carry an explicit `.schema('<name>')`. Without it PostgREST
resolves against `public`, the call fails at runtime, and — because the
generated `Database` type covers every exposed schema — the compiler will catch
the omission only if you have not silenced it with a cast.

Do not reach for `as never` to quiet a query. It is what hid a completely
inert notification pipeline for months, and a home-page query selecting three
columns that did not exist. If a query will not typecheck, the query is wrong.

---

## 12. Testing

| Level       | Targets                  | Against                                                   |
| ----------- | ------------------------ | --------------------------------------------------------- |
| Unit        | Services, policy, utils  | Mocked supabase-js or a local in-memory layer             |
| Integration | Repositories + RLS       | A local Supabase (CLI) with seeded fixtures               |
| E2E         | Server Actions           | A local Supabase + Playwright / Vitest hits a running app |
| Schema      | Migrations apply cleanly | Local Supabase + `supabase db reset`                      |
