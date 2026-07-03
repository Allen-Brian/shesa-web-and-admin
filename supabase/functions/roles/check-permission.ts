/**
 * Edge Function: check-permission
 *
 * Wraps `core.has_permission` for app callers that need the result in
 * TypeScript (not just inside an RLS policy). Used by Server Actions
 * to gate UI BEFORE attempting a mutation — e.g. show/hide a "grant
 * role" button based on whether the user could actually use it.
 *
 * This is the simplest Edge Function in the system — pure read, no
 * mutation — and serves as the canonical pattern other functions
 * follow:
 *
 *   1. Build request context (trace id, JWT, idempotency key)
 *   2. CORS preflight handling
 *   3. Authentication check (require a user JWT)
 *   4. Zod input validation (422 envelope on failure)
 *   5. Do the work (here: RPC to has_permission)
 *   6. Return success or error envelope, both with CORS headers
 *
 * For pure self-introspection (the only allowed case), no extra audit
 * is needed — `core.has_permission` is called as the user themselves
 * and is allowed by its own self-guard.
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, success, unauthorized } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z.object({
  scopeId: z.string().uuid(),
  permission: z.string().min(1),
});

interface SuccessBody {
  allowed: boolean;
  traceId: string;
}

export async function checkPermission(req: Request): Promise<Response> {
  // 1. CORS preflight
  // 2. Per-request context
  const ctx = buildContext(req);

  // 3. Require authentication — this function only answers the
  //    caller's own permissions per the has_permission self-guard.
  if (!ctx.userId || !ctx.jwt) {
    return withCors(req, unauthorized(ctx.traceId));
  }

  // 4. Input validation
  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);

  const { scopeId, permission } = parsed.data;

  // 5. Do the work — RPC under the caller's JWT so the self-guard
  //    in has_permission is satisfied.
  const supabase = createUserClient(ctx.jwt);
  const { data, error } = await supabase.schema('core' as never).rpc('has_permission' as never, {
    p_user_id: ctx.userId,
    p_scope_id: scopeId,
    p_permission_key: permission,
  });

  if (error) {
    // The has_permission function raises 42501 if the caller tries to
    // check another user's permissions. The self-guard shouldn't fire
    // because we pass ctx.userId, but if a forwarded request ever
    // tries something different we surface it as forbidden, not 500.
    if (error.code === '42501') {
      return withCors(
        req,
        forbidden("cannot check another user's permissions", ctx.traceId, {
          checkedFor: ctx.userId,
        }),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'check-permission: has_permission RPC failed',
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  // 6. Success envelope
  const body: SuccessBody = { allowed: data === true, traceId: ctx.traceId };
  return withCors(req, success(body));
}
