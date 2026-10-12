# 0009 — Standardized error envelope with stable codes

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

If the client has to handle every possible error shape (Supabase errors, Server Action thrown errors, validation arrays, network failures) separately, error UIs proliferate and inconsistencies leak through. The client needs one shape to switch on.

## Decision

Every error returned from a Server Action, Route Handler, or Edge Function is shaped uniformly:

```json
{
  "status": 422,
  "code": "MEMBER_NOT_FOUND",
  "message": "Member does not exist",
  "traceId": "…",
  "fields": {}
}
```

- `code` is a **stable, machine-readable string** (`MEMBER_NOT_FOUND`, `FORBIDDEN`, `VALIDATION_FAILED`, `INSUFFICIENT_BALANCE`). The client switches on `code`, not on message text.
- `traceId` = the `X-Request-Id` propagated from the client, so a user-facing error screen can show a support code that ties to logs and Sentry.
- Domain errors are typed (`MemberNotFoundError`, `PaymentFailedError`) — Server Actions throw domain errors, a top-level error boundary in `packages/domain/errors` maps them to the envelope.
- Supabase Postgres errors (`PostgrestError`) are mapped to the envelope at the data-access boundary — never returned raw.

## Consequences

- The client has one error type to handle; one error renderer per surface.
- Support can quote `traceId` and pull the full request trace.
- Error codes are a stable API surface — changing one is a breaking change.
- Stack traces and PII are never in the envelope; logs and Sentry get the detail.
- Pairs with `X-Request-Id` propagation across client → Server Action → Supabase → logs → Sentry.

## Alternatives considered

- **Raw Supabase / fetch errors** — rejected: forces every UI site to handle shape variation.
- **Throw-and-catch with class checks only (no code field)** — rejected: works for in-process Server Actions but loses fidelity when the same error originates in an Edge Function or webhook.
- **Message-text matching on the client** — rejected: i18n nightmare and brittle.
