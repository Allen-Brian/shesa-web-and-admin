import 'server-only';

import { getServerClient } from '@/lib/supabase-server';

/**
 * The "active" finance scope for the current user — the set of scopes
 * finance loaders should filter their reads to.
 *
 * The rule (spec Part XV + 2026-07 direction): a Mainstream Finance
 * operator (NULL-scope `finance` role or `mainstream_admin`) sees ONLY
 * mainstream-scope rows. They do not roll up branch/chapter finances.
 * Everything a branch collects stays on that branch's ledger.
 *
 * A branch-scoped Finance operator sees the scopes they hold
 * `finance` at — usually one, occasionally more.
 *
 * Loaders call this once, then apply `.in('scope_id', result.scopeIds)`
 * to every `finance.*` query. RLS still enforces the ceiling
 * (`core.has_permission`) — this helper is the floor: even if RLS
 * would let a mainstream user see a branch treasury, we don't ask.
 */
export type ActiveFinanceScope =
  | {
      readonly kind: 'mainstream';
      readonly scopeIds: readonly [string]; // exactly the mainstream scope id
    }
  | {
      readonly kind: 'scoped';
      readonly scopeIds: readonly string[]; // one or more branch/chapter scope ids
    };

interface RoleAssignmentRow {
  readonly scope_id: string | null;
  readonly revoked_at: string | null;
  readonly starts_at: string;
  readonly ends_at: string | null;
  readonly roles: { readonly key: string };
}

/**
 * Compute the active finance scope for a given user. Reads
 * `core.role_assignments` + `core.roles` + `core.scopes` once. Returns
 * `null` when the caller has no finance grant at all (loaders should
 * short-circuit to empty results).
 */
export async function activeFinanceScope(userId: string): Promise<ActiveFinanceScope | null> {
  const supabase = await getServerClient();

  const { data: grantsRaw } = await supabase
    .schema('core')
    .from('role_assignments')
    .select('scope_id, revoked_at, starts_at, ends_at, roles!inner(key)')
    .eq('user_id', userId)
    .is('revoked_at', null);

  const grants = ((grantsRaw ?? []) as RoleAssignmentRow[]).filter(isActiveFinanceGrant);
  if (grants.length === 0) return null;

  // Any NULL-scope grant → mainstream persona. Resolve the mainstream
  // scope id live (it's a single row keyed by scope_type='mainstream').
  if (grants.some((g) => g.scope_id === null)) {
    const { data: mainstream } = await supabase
      .schema('core')
      .from('scopes')
      .select('id')
      .eq('scope_type', 'mainstream')
      .maybeSingle();
    if (!mainstream) return null;
    return { kind: 'mainstream', scopeIds: [(mainstream as { id: string }).id] as const };
  }

  const scopeIds = Array.from(
    new Set(grants.map((g) => g.scope_id).filter((x): x is string => !!x)),
  );
  if (scopeIds.length === 0) return null;
  return { kind: 'scoped', scopeIds };
}

function isActiveFinanceGrant(row: RoleAssignmentRow): boolean {
  const now = Date.now();
  if (row.roles.key !== 'finance' && row.roles.key !== 'mainstream_admin') return false;
  if (row.revoked_at) return false;
  if (new Date(row.starts_at).getTime() > now) return false;
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) return false;
  return true;
}
