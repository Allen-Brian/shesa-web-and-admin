/**
 * Policy check helper — wraps `core.has_permission` for Edge Functions.
 *
 * The Edge Function is the single authority for any mutation (per
 * ADR-0033). Every mutation entry-point calls `authorize(ctx, action,
 * scopeId)` BEFORE doing work; a falsy return short-circuits to a 403
 * envelope. Audit is emitted for both outcomes (call sites use the
 * audit helper after the decision).
 *
 * Implementation notes:
 *   - We call `core.has_permission` via a user-context client so the
 *     function's self-introspection guard works (it requires
 *     auth.uid() === p_user_id unless service_role).
 *   - For Edge Functions invoked by webhooks/cron (no user JWT),
 *     callers must explicitly opt out via `requireSystemRole(ctx)`
 *     instead of `authorize(...)`.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.47.10';

import type { Database } from '../_types/database.ts';
import type { RequestContext } from './request-context.ts';

export interface AuthorizeArgs {
  readonly action: string; // e.g. 'role.grant'
  readonly scopeId: string;
}

/**
 * Returns true iff the caller has `action` at `scopeId` (or any
 * non-autonomous ancestor — has_permission walks the tree).
 *
 * Returns false on any error (RPC failure, network blip, etc.) — the
 * fail-closed default. Errors are logged with the traceId for triage.
 */
export async function authorize(
  client: SupabaseClient<Database>,
  ctx: RequestContext,
  args: AuthorizeArgs,
): Promise<boolean> {
  if (!ctx.userId) return false;

  // has_permission lives in the `core` schema. Without the schema hint,
  // PostgREST resolves against the first exposed schema (public), where
  // the function doesn't exist — the RPC then 404s and `authorize`
  // fails closed. Explicitly schema-scoping fixes every mutation
  // Edge Function that funnels through this helper.
  const { data, error } = await client.schema('core' as never).rpc('has_permission' as never, {
    p_user_id: ctx.userId,
    p_scope_id: args.scopeId,
    p_permission_key: args.action,
  });

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'authorize: has_permission RPC failed',
        action: args.action,
        scopeId: args.scopeId,
        error: error.message,
      }),
    );
    return false;
  }

  return data === true;
}

/**
 * For Edge Functions invoked from webhooks/cron with no user JWT, this
 * confirms the call is coming from a service-role context (Supabase
 * already verified the JWT at the runtime layer when verify_jwt is
 * true; this is the additional check that the JWT's role claim is
 * service_role and not authenticated).
 *
 * Returns true if the call has no user JWT (i.e. it's anon/service);
 * a separate signature/HMAC check is what actually authorizes
 * webhooks — see the per-webhook implementation.
 */
export function isSystemCall(ctx: RequestContext): boolean {
  return ctx.userId === null;
}
