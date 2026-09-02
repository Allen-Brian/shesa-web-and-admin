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

  // Entry gate. Being signed in is not enough: without this, any account
  // with a login — including a plain member who claimed an invite —
  // reached the whole Exco console. RLS still filtered the data, but
  // every Server Action exported from this tree became a reachable
  // endpoint. `/editor` has always gated this way; Exco now matches.
  //
  // The gate is "holds any active grant" rather than a specific key on
  // purpose. Exco spans Clusters, Memberships, Events, Announcements,
  // Positions, Audit and Settings, each keyed differently — an announcer
  // holds none of the cluster or membership keys but belongs here. A
  // narrower gate would lock out legitimate roles; the per-surface
  // sidebar flags below and the Edge Functions behind each write are
  // what enforce the finer grain.
  //
  // RLS on role_assignments admits a user to their own rows, so this
  // runs safely under the caller's JWT.
  const { data: grants } = await supabase
    .schema('core')
    .from('role_assignments')
    .select('id, ends_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .lte('starts_at', new Date().toISOString());

  const nowMs = Date.now();
  const hasActiveGrant = (grants ?? []).some(
    (g) => !g.ends_at || new Date(g.ends_at).getTime() > nowMs,
  );
  if (!hasActiveGrant) {
    redirect('/');
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

  // Audit + Settings visibility. For the global admin (mainstream) the
  // check runs at Mainstream; for a branch admin it runs at their first
  // scoped grant. `has_permission` walks up the tree, so both cases
  // resolve without special-casing.
  //
  // Invites is DIFFERENT — it is a Mainstream-exclusive surface. Only
  // the global admin imports members into the system, so only they see
  // Invites. Branches never dispatch invites themselves; they just
  // manage members that already exist.
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
  // Branch-scope fallback covers Audit + Settings only. Invites is
  // deliberately excluded here — see comment above.
  if (!canReadAudit || !canEditOwnScope) {
    const firstScope = memberableScopes[0];
    if (firstScope) {
      const [{ data: audit2 }, { data: update2 }] = await Promise.all([
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
      ]);
      canReadAudit = canReadAudit || audit2 === true;
      canEditOwnScope = canEditOwnScope || update2 === true;
    }
  }

  // Finance-read visibility on the admin sidebar. The finance module's
  // RLS treats `treasury.read` and `finance.read` as parallel keys —
  // either grant reveals charges / obligations / contributions to the
  // caller. We mirror that here so:
  //   - mainstream_admin (NULL-scope treasury.read) — YES
  //   - branch_admin (scoped finance.read per the seed) — YES
  //   - finance role at their body — YES (but they usually route to
  //     the /finance persona; the exco sidebar still shows them the
  //     read-only surface if they poke around here).
  //
  // `has_permission_at_any_scope` is SECURITY DEFINER so it bypasses
  // RLS on the RBAC tables. Two lookups instead of one avoids a
  // brittle nested PostgREST filter and stays cheap on the same
  // request.
  const [{ data: allowedTreasury }, { data: allowedFinance }] = await Promise.all([
    supabase.schema('core').rpc('has_permission_at_any_scope', {
      p_user_id: user.id,
      p_key: 'treasury.read',
    } as never),
    supabase.schema('core').rpc('has_permission_at_any_scope', {
      p_user_id: user.id,
      p_key: 'finance.read',
    } as never),
  ]);
  const canReadFinance = allowedTreasury === true || allowedFinance === true;

  // Global Admin heuristic: `scope.manage_capabilities` at Mainstream
  // is a mainstream_admin-only permission (branch_admin doesn't have
  // it). Assessments — the "levies imposed on us" view — is meaningless
  // for the person who does the levying, so we hide it for Global
  // Admins and only surface it to scoped admins (branch / autonomous
  // chapter).
  let isGlobalAdmin = false;
  if (mainstream) {
    const { data: canManageCaps } = await supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: mainstream.id,
      p_permission_key: 'scope.manage_capabilities',
    });
    isGlobalAdmin = canManageCaps === true;
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
      canReadFinance={canReadFinance}
      isGlobalAdmin={isGlobalAdmin}
    >
      {children}
    </AppShell>
  );
}
