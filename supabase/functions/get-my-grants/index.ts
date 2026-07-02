/**
 * Edge Function: get-my-grants
 *
 * SPA session bridge helper (ADR-0035). The Vite SPA (`apps/exco`,
 * `apps/finance`) calls this once on mount, right after `/api/session`
 * resolves an authenticated user, and stores the response in a Zustand
 * grant cache used by the sidebar + optimistic route guards.
 *
 * Returns a flat list of (scope, role, permission_keys[]) tuples for
 * the caller's own active grants. Scope-hierarchy walking is deferred
 * to the client — the authoritative per-mutation check remains
 * `core.has_permission` via the `check-permission` Edge Function.
 * Cached grants are a UX optimization, never a security boundary.
 *
 * Self-only: the underlying `core.get_user_grants` refuses to answer
 * for any user other than `auth.uid()` unless the caller is
 * service_role. This function forwards `ctx.userId`, so the guard is
 * satisfied by construction.
 */

import { handlePreflight, withCors } from '../_shared/cors.ts';
import { forbidden, internalError, success, unauthorized } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';

interface Grant {
  scopeId: string | null;
  scopeType: string;
  scopeName: string;
  roleKey: string;
  permissionKeys: string[];
}

interface SuccessBody {
  grants: Grant[];
  traceId: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const ctx = buildContext(req);

  if (!ctx.userId || !ctx.jwt) {
    return withCors(req, unauthorized(ctx.traceId));
  }

  const supabase = createUserClient(ctx.jwt);
  const { data, error } = await supabase.rpc('get_user_grants' as never, {
    p_user_id: ctx.userId,
  });

  if (error) {
    if (error.code === '42501') {
      return withCors(
        req,
        forbidden("cannot list another user's grants", ctx.traceId, {
          checkedFor: ctx.userId,
        }),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'get-my-grants: get_user_grants RPC failed',
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  // Postgres → JS: the RPC returns an array of rows with snake_case
  // keys. Normalize to camelCase for the SPA cache.
  const rows = (data ?? []) as Array<{
    scope_id: string | null;
    scope_type: string;
    scope_name: string;
    role_key: string;
    permission_keys: string[] | null;
  }>;

  const grants: Grant[] = rows.map((r) => ({
    scopeId: r.scope_id,
    scopeType: r.scope_type,
    scopeName: r.scope_name,
    roleKey: r.role_key,
    permissionKeys: r.permission_keys ?? [],
  }));

  const body: SuccessBody = { grants, traceId: ctx.traceId };
  return withCors(req, success(body));
});
