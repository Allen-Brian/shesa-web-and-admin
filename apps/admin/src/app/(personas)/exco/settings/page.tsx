import { notFound, redirect } from 'next/navigation';

import { ScopePicker } from '@/components/memberships/scope-picker';
import { resolveMemberableScopes } from '@/lib/memberships/memberable-scopes';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Settings landing — resolves the viewer's editable scope.
 *
 *   Global mainstream_admin → prompted with the memberable-scopes picker
 *     since Mainstream is not directly editable via this UI.
 *   Branch admin → single scope, auto-redirect.
 *
 * Only branches + autonomous chapters qualify. Batches, houses, and
 * networks live under Clusters, not Settings.
 */
export default async function SettingsLandingPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco/settings');

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
