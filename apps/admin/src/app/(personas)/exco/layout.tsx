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

  // Memberships sidebar visibility: any active scoped grant at a
  // branch-like scope (branch or autonomous chapter). Global
  // mainstream_admin does NOT qualify — Memberships is exclusive to
  // branches; the global admin browses members through Clusters.
  const memberableScopes = await resolveMemberableScopes(supabase, user.id);
  const canManageMemberships = memberableScopes.length > 0;

  // Audit + Settings + Invites visibility. For the global admin
  // (mainstream) the check runs at Mainstream; for a branch admin it
  // runs at their first scoped grant. `has_permission` walks up the
  // tree, so both cases resolve without special-casing.
  let canReadAudit = false;
  let canEditOwnScope = false;
  let canViewInvites = false;
  if (mainstream) {
    const [{ data: allowedAudit }, { data: allowedUpdate }, { data: allowedInvites }] =
      await Promise.all([
        supabase.schema('core').rpc('has_permission', {
          p_user_id: user.id,
          p_scope_id: mainstream.id,
          p_permission_key: 'audit.read',
        }),
        supabase.schema('core').rpc('has_permission', {
          p_user_id: user.id,
          p_scope_id: mainstream.id,
          p_permission_key: 'scope.update',
        }),
        supabase.schema('core').rpc('has_permission', {
          p_user_id: user.id,
          p_scope_id: mainstream.id,
          p_permission_key: 'member.import',
        }),
      ]);
    canReadAudit = allowedAudit === true;
    canEditOwnScope = allowedUpdate === true;
    canViewInvites = allowedInvites === true;
  }
  // A branch admin's grant is scoped, so the Mainstream check above
  // returns false. Fall back: they qualify if they have any scoped
  // grant that carries the permission. `memberableScopes` already
  // resolved their branch-like scopes; check the first.
  if (!canReadAudit || !canEditOwnScope || !canViewInvites) {
    const firstScope = memberableScopes[0];
    if (firstScope) {
      const [{ data: audit2 }, { data: update2 }, { data: invites2 }] = await Promise.all([
        canReadAudit
          ? Promise.resolve({ data: true })
          : supabase.schema('core').rpc('has_permission', {
              p_user_id: user.id,
              p_scope_id: firstScope.id,
              p_permission_key: 'audit.read',
            }),
        canEditOwnScope
          ? Promise.resolve({ data: true })
          : supabase.schema('core').rpc('has_permission', {
              p_user_id: user.id,
              p_scope_id: firstScope.id,
              p_permission_key: 'scope.update',
            }),
        canViewInvites
          ? Promise.resolve({ data: true })
          : supabase.schema('core').rpc('has_permission', {
              p_user_id: user.id,
              p_scope_id: firstScope.id,
              p_permission_key: 'member.import',
            }),
      ]);
      canReadAudit = canReadAudit || audit2 === true;
      canEditOwnScope = canEditOwnScope || update2 === true;
      canViewInvites = canViewInvites || invites2 === true;
    }
  }

  return (
    <AppShell
      persona="exco"
      userEmail={userEmail}
      userName={userName}
      avatarUrl={profile?.avatar_url ?? undefined}
      canManageClusters={canManageClusters}
      canManageMemberships={canManageMemberships}
      canReadAudit={canReadAudit}
      canEditOwnScope={canEditOwnScope}
      canViewInvites={canViewInvites}
    >
      {children}
    </AppShell>
  );
}
