import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves the set of branch-like scopes a given user administers.
 *
 * A scope is "memberable" (as of 2026-07-05) if:
 *   - Its scope_type is `branch`, OR
 *   - It's a `chapter` with `chapter_kind = 'autonomous'`.
 *
 * Batches, grouping chapters, houses, and networks are NOT memberable —
 * batches became a cluster-only filter dimension in the 2026-07-05
 * batch-admin drop, and grouping-chapters have never had their own
 * membership rolls.
 *
 * A user is admitted for a scope only if they hold `member.read` at
 * that scope via a **scoped** grant (`scope_id = <branch>`). Global
 * grants (`scope_id IS NULL`) do NOT admit into Memberships — the
 * global mainstream_admin browses members through Clusters instead,
 * matching the "Memberships is exclusive to branches" lock. This is
 * a UI navigation rule; RLS still lets the global admin read every
 * member row, they just don't get the Memberships sidebar section.
 *
 * `member.read` is the right gate — every branch admin holds it, and
 * per-page gates on Requests / Transfers / Registration re-check
 * their finer-grained permissions server-side.
 *
 * Used by:
 *   - The exco layout's `canManageMemberships` flag (any result → TRUE).
 *   - Each Memberships sub-page's landing (zero → empty state; one →
 *     redirect; multiple → scope picker).
 *   - The scope-picker widget.
 *
 * Runs under the caller's JWT — RLS on `role_assignments` restricts
 * results to their own grants.
 */

export interface MemberableScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly scope_type: 'branch' | 'chapter';
  readonly chapter_kind: 'autonomous' | 'grouping' | null;
}

// The helper switches to the `core` schema per-query via `.schema('core')`,
// so the outer client type doesn't need to be pre-scoped. Accept any
// SupabaseClient shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export async function resolveMemberableScopes(
  supabase: AnySupabaseClient,
  userId: string,
): Promise<MemberableScope[]> {
  const { data: grants } = await supabase
    .schema('core')
    .from('role_assignments')
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
    .not('scope_id', 'is', null)
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
  const scopedIds = new Set(
    ((grants as RawGrant[] | null) ?? [])
      .filter((g) => !g.ends_at || new Date(g.ends_at).getTime() > now)
      .filter(
        (g) =>
          g.scope_id !== null &&
          (g.role?.role_permissions.some((rp) => rp.permissions?.key === 'member.read') ?? false),
      )
      .map((g) => g.scope_id as string),
  );

  if (scopedIds.size === 0) return [];

  const { data: candidates } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, slug, name, scope_type, chapter_kind, status')
    .eq('status', 'active')
    .in('id', Array.from(scopedIds))
    .in('scope_type', ['branch', 'chapter']);

  interface RawScope {
    id: string;
    slug: string;
    name: string;
    scope_type: string;
    chapter_kind: string | null;
  }

  return ((candidates as RawScope[] | null) ?? [])
    .filter((s) => {
      if (s.scope_type === 'branch') return true;
      if (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous') return true;
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
