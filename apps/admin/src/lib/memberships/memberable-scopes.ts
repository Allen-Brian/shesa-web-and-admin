import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves the set of scopes a given user can manage memberships at.
 *
 * A scope is "memberable" if:
 *   - Its scope_type is `branch` OR `batch`, OR
 *     it's a `chapter` with `chapter_kind = 'autonomous'`.
 *   - Grouping chapters are explicitly excluded (spec invariant).
 *
 * A user is admitted for that scope if:
 *   - They hold `member.read` at that scope (scoped grant), OR
 *   - They hold `member.read` with `scope_id = NULL` (global grant →
 *     sees every memberable scope).
 *
 * `member.read` is the right gate — it's the "can view members here"
 * permission every membership admin holds. `membership.*` keys are
 * more specific (approve join / transfer / mark passive) and per-page
 * gates check them again server-side. This helper only decides
 * sidebar visibility + landing-page scope enumeration.
 *
 * Used by:
 *   - The exco layout's `canManageMemberships` flag (any result → TRUE).
 *   - Each Memberships sub-page's landing (zero → empty state; one →
 *     redirect; multiple → scope picker).
 *   - The scope-picker widget.
 *
 * Runs under the caller's JWT — RLS on `role_assignments` restricts
 * results to their own grants. `has_permission`'s self-introspection
 * guard applies via the RLS policies.
 */

export interface MemberableScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly scope_type: 'branch' | 'chapter' | 'batch';
  readonly chapter_kind: 'autonomous' | 'grouping' | null;
}

// The helper switches to the `core` schema per-query via `.schema('core' as never)`,
// so the outer client type doesn't need to be pre-scoped. Accept any
// SupabaseClient shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export async function resolveMemberableScopes(
  supabase: AnySupabaseClient,
  userId: string,
): Promise<MemberableScope[]> {
  // 1. Fetch every active role_assignment for the user that carries
  //    `member.read`. Two shapes matter: scope_id set (scoped grant)
  //    and scope_id NULL (global grant).
  const { data: grants } = await supabase
    .schema('core' as never)
    .from('role_assignments' as never)
    .select(
      `
        scope_id,
        starts_at,
        ends_at,
        revoked_at,
        role:role_id (
          role_permissions:role_permissions (
            permissions:permission_id ( key )
          )
        )
      `,
    )
    .eq('user_id', userId)
    .is('revoked_at', null)
    .lte('starts_at', new Date().toISOString());

  interface RawGrant {
    scope_id: string | null;
    ends_at: string | null;
    role: {
      role_permissions: Array<{
        permissions: { key: string } | null;
      }>;
    } | null;
  }

  const now = Date.now();
  const activeGrants = ((grants as RawGrant[] | null) ?? []).filter(
    (g) => !g.ends_at || new Date(g.ends_at).getTime() > now,
  );

  const hasMemberRead = (g: RawGrant) =>
    g.role?.role_permissions.some((rp) => rp.permissions?.key === 'member.read') ?? false;

  const hasGlobalGrant = activeGrants.some((g) => g.scope_id === null && hasMemberRead(g));
  const scopedIds = new Set(
    activeGrants
      .filter((g) => g.scope_id !== null && hasMemberRead(g))
      .map((g) => g.scope_id as string),
  );

  if (!hasGlobalGrant && scopedIds.size === 0) return [];

  // 2. Fetch candidate scopes. Global grant → all memberable scopes;
  //    otherwise → just the scoped-grant IDs.
  const query = supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id, slug, name, scope_type, chapter_kind, status')
    .eq('status', 'active')
    .in('scope_type', ['branch', 'chapter', 'batch']);

  const { data: candidates } = hasGlobalGrant
    ? await query
    : await query.in('id', Array.from(scopedIds));

  interface RawScope {
    id: string;
    slug: string;
    name: string;
    scope_type: string;
    chapter_kind: string | null;
  }

  return ((candidates as RawScope[] | null) ?? [])
    .filter((s) => {
      if (s.scope_type === 'branch' || s.scope_type === 'batch') return true;
      if (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous') return true;
      // Explicit grouping-chapter exclusion — spec invariant.
      return false;
    })
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      scope_type: s.scope_type as MemberableScope['scope_type'],
      chapter_kind: s.chapter_kind as MemberableScope['chapter_kind'],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
