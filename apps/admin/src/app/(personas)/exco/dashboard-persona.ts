import type { getServerClient } from '@/lib/supabase-server';

type ServerClient = Awaited<ReturnType<typeof getServerClient>>;

export interface DashboardPersona {
  readonly isGlobalAdmin: boolean;
  /** Empty array when isGlobalAdmin is true — global sees everything. */
  readonly myScopeIds: readonly string[];
}

/**
 * Detect the viewer's admin persona for the /exco dashboard.
 *
 * Global Admin = `mainstream_admin` at NULL scope, i.e. holds
 * `scope.manage_capabilities` on the singleton mainstream scope. Any
 * other viewer is scoped to their branch / autonomous-chapter grants.
 *
 * Returns `myScopeIds` as the list of scopes the viewer holds a live
 * (non-revoked, non-expired) role at. For global admins that list is
 * empty because every downstream filter short-circuits on `isGlobalAdmin`.
 */
export async function detectDashboardPersona(
  supabase: ServerClient,
  userId: string,
): Promise<DashboardPersona> {
  const { data: mainstream } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name')
    .eq('scope_type', 'mainstream')
    .maybeSingle();

  let isGlobalAdmin = false;
  if (mainstream) {
    const { data } = await supabase.schema('core').rpc('has_permission', {
      p_user_id: userId,
      p_scope_id: mainstream.id,
      p_permission_key: 'scope.manage_capabilities',
    });
    isGlobalAdmin = data === true;
  }

  if (isGlobalAdmin) return { isGlobalAdmin, myScopeIds: [] };

  const { data: grants } = await supabase
    .schema('core')
    .from('role_assignments')
    .select('scope_id, revoked_at, ends_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .not('scope_id', 'is', null);

  const now = Date.now();
  const myScopeIds = Array.from(
    new Set(
      (
        (grants ?? []) as Array<{
          scope_id: string | null;
          revoked_at: string | null;
          ends_at: string | null;
        }>
      )
        .filter((g) => !g.ends_at || new Date(g.ends_at).getTime() > now)
        .map((g) => g.scope_id!)
        .filter(Boolean),
    ),
  );

  return { isGlobalAdmin, myScopeIds };
}
