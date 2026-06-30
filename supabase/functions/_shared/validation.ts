/**
 * Zod parse wrapper that maps failures to the standard 422 envelope.
 *
 * Edge Functions should call `parseJson(req, schema, ctx.traceId)` at
 * the top of their handler and return immediately on Response — that
 * keeps the validation-failure-shape consistent across every function.
 */

import { z, type ZodIssue, type ZodTypeAny } from 'npm:zod@3.24.1';

import { validationError } from './errors.ts';

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

/**
 * Parse the request's JSON body against a Zod schema. Returns either
 * the typed `data` OR a Response (a 422 envelope) ready to return.
 */
export async function parseJson<S extends ZodTypeAny>(
  req: Request,
  schema: S,
  traceId: string,
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: validationError('Request body is not valid JSON', traceId),
    };
  }

  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };

  return {
    ok: false,
    response: validationError(
      'Input failed validation',
      traceId,
      flattenIssues(result.error.issues),
    ),
  };
}

/** Convert Zod issues into a flat field-error map for the envelope. */
function flattenIssues(issues: ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const path = i.path.length ? i.path.join('.') : '_';
    // First message per path wins — Zod often produces multiple for
    // the same field; the first is the most specific.
    if (!(path in out)) out[path] = i.message;
  }
  return out;
}
