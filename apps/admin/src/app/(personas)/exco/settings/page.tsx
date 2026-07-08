import { notFound, redirect } from 'next/navigation';

import { ScopePicker } from '@/components/memberships/scope-picker';
import { resolveMemberableScopes } from '@/lib/memberships/memberable-scopes';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Settings landing — resolves the viewer's Settings surface.
 *
 *   Global mainstream_admin → routed to /exco/settings/mainstream, a
 *     governance-only view of the federation-wide executive slate + the
 *     NULL-scope role grants. Mainstream isn't a branch, so it can't
 *     use the per-scope Edit + Governance shell.
 *   Branch admin (single memberable scope) → auto-redirect to that scope.
 *   Otherwise → picker.
 *
 * Only branches + autonomous chapters qualify for the scope-slug route.
 * Batches, houses, and networks live under Clusters, not Settings.
 */
export default async function SettingsLandingPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco/settings');

  // Global Admin lens first — `scope.manage_capabilities` at Mainstream
  // is mainstream_admin-exclusive per the seed (branch_admin doesn't
  // carry it). If the caller passes, they see the Mainstream governance
  // slate, not a picker.
  const { data: mainstream } = await supabase
    .schema('core')
    .from('scopes')
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (mainstream) {
    const { data: canManageCaps } = await supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: mainstream.id,
      p_permission_key: 'scope.manage_capabilities',
    });
    if (canManageCaps === true) redirect('/exco/settings/mainstream');
  }

  const scopes = await resolveMemberableScopes(supabase, user.id);

  // Filter to scopes where the viewer actually has scope.update. The
  // memberable-scopes helper gates on member.read; a branch_admin usually
  // has both, so this is a light second-pass rather than a re-resolve.
  const withUpdate: typeof scopes = [];
  for (const s of scopes) {
    const { data: allowed } = await supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: s.id,
      p_permission_key: 'scope.update',
    });
    if (allowed === true) withUpdate.push(s);
  }

  if (withUpdate.length === 0) notFound();
  if (withUpdate.length === 1) redirect(`/exco/settings/${withUpdate[0]!.slug}`);

  return (
    <ScopePicker
      persona="exco"
      section="settings"
      scopes={withUpdate}
      title="Settings"
      subtitle="Pick the branch or autonomous chapter you want to configure."
    />
  );
}
