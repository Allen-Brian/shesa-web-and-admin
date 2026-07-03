import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell';
import { resolveMemberableScopes } from '@/lib/memberships/memberable-scopes';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function ExcoLayout({ children }: { readonly children: ReactNode }) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/exco');
  }

  const [{ data: profile }, { data: mainstream }] = await Promise.all([
    supabase
      .schema('core')
      .from('profiles')
      .select('display_name, email, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .schema('core')
      .from('scopes')
      .select('id')
      .eq('scope_type', 'mainstream')
      .maybeSingle(),
  ]);

  const userEmail = profile?.email ?? user.email ?? '';
  const userName = profile?.display_name ?? userEmail.split('@')[0] ?? 'User';

  // Clusters management is a mainstream-admin surface — the sidebar's
  // Clusters section only renders when the current user can create
  // scopes at Mainstream. Global mainstream_admin (NULL scope grant)
  // passes the check via has_permission's NULL-scope bypass.
  let canManageClusters = false;
  if (mainstream) {
    const { data: allowed } = await supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: mainstream.id,
      p_permission_key: 'scope.create',
    });
    canManageClusters = allowed === true;
  }

  // Memberships sidebar visibility: any active membership.* grant at
  // any branch / autonomous chapter / batch. Global grants also pass.
  const memberableScopes = await resolveMemberableScopes(supabase, user.id);
  const canManageMemberships = memberableScopes.length > 0;

  return (
    <AppShell
      persona="exco"
      userEmail={userEmail}
      userName={userName}
      avatarUrl={profile?.avatar_url ?? undefined}
      canManageClusters={canManageClusters}
      canManageMemberships={canManageMemberships}
    >
      {children}
    </AppShell>
  );
}
