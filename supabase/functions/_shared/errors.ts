/**
 * Standard error envelope for Edge Function responses (ADR-0009).
 *
 * Every Edge Function returns either a success body OR an envelope of:
 *
 *   { status, code, message, traceId, fields? }
 *
 * The Server Action that called the Edge Function maps a non-2xx
 * response to this shape and throws or returns it. The component sees
 * one error shape regardless of where the error originated (Zod parse,
 * policy denial, downstream failure, etc.).
 */

export interface ErrorEnvelope {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly traceId: string;
  readonly fields?: Readonly<Record<string, string>>;
}

const JSON_HEADERS = { 'content-type': 'application/json' };

export function envelope(
  status: number,
  code: string,
  message: string,
  traceId: string,
  fields?: Record<string, string>,
): Response {
  const body: ErrorEnvelope = fields
    ? { status, code, message, traceId, fields }
    : { status, code, message, traceId };
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/** 422 — Zod parse failed, malformed input, etc. */
export const validationError = (
  message: string,
  traceId: string,
  fields?: Record<string, string>,
) => envelope(422, 'VALIDATION_FAILED', message, traceId, fields);

/** 401 — no session / unauthenticated. */
export const unauthorized = (traceId: string) =>
  envelope(401, 'UNAUTHORIZED', 'Not authenticated', traceId);

/** 403 — authenticated but lacking the required permission. */
export const forbidden = (deniedFor: string, traceId: string, context?: Record<string, string>) =>
  envelope(403, 'FORBIDDEN', `Forbidden: ${deniedFor}`, traceId, { deniedFor, ...(context ?? {}) });

/** 404 — resource lookup failed. */
export const notFound = (entity: string, traceId: string) =>
  envelope(404, `${entity.toUpperCase()}_NOT_FOUND`, `${entity} not found`, traceId);

/** 409 — conflict (idempotency hit, unique violation, etc.). */
export const conflict = (code: string, message: string, traceId: string) =>
  envelope(409, code, message, traceId);

/** 500 — unexpected. Never include the underlying error message in
 *  `message` — that can leak DB column names, file paths, etc. Log
 *  the cause server-side; the envelope only carries the traceId. */
export const internalError = (traceId: string) =>
  envelope(500, 'INTERNAL_ERROR', 'An unexpected error occurred', traceId);

/** Success body — convenience for typed JSON 200/2xx responses. */
export function success<T extends object>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
