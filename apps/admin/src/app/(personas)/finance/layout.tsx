import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { PrivacyProvider } from '@shesa/ui';

import { AppShell } from '@/components/app-shell';
import { loadSidebarGroups } from '@/lib/finance/groups/load-sidebar-groups';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Finance persona layout.
 *
 * Resolves the finance sidebar's `isGlobal` flag by checking whether the
 * caller holds the `finance` role at a NULL scope — the canonical shape
 * for platform-wide finance authority (spec Part XV). NULL-scope grants
 * bypass the recursive-CTE scope walk in `has_permission` and reach
 * every finance-bearing body including autonomous chapters.
 *
 * The isGlobal chip in the sidebar makes the reach visible at a glance
 * so an operator never confuses their branch-scoped view with the
 * platform-wide one.
 */
export default async function FinanceLayout({ children }: { readonly children: ReactNode }) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/finance');
  }

  // Entry gate. Being signed in is not enough: without this, any account
  // with a login — including a plain member who claimed an invite —
  // reached the whole Finance console. RLS still filtered the data, but
  // every Server Action exported from this tree became a reachable
  // endpoint, and the correctness of each one was the only thing left in
  // the way. `/editor` has always gated this way; Finance now matches.
  //
  // Either key admits: the finance RLS policies treat `treasury.read` and
  // `finance.read` as parallel, so gating on one alone would lock out
  // holders of the other.
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
  if (allowedTreasury !== true && allowedFinance !== true) {
    redirect('/');
  }

  const { data: profile } = await supabase
    .schema('core')
    .from('profiles')
    .select('display_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const userEmail = profile?.email ?? user.email ?? '';
  const userName = profile?.display_name ?? userEmail.split('@')[0] ?? 'User';

  // Global finance = a NULL-scope grant of the finance role (or of
  // mainstream_admin, which subsumes finance). Anything else is a
  // branch-scoped finance officer.
  const { data: globalGrants } = await supabase
    .schema('core')
    .from('role_assignments')
    .select('role_id, revoked_at, starts_at, ends_at, roles!inner(key)')
    .eq('user_id', user.id)
    .is('scope_id', null)
    .is('revoked_at', null);

  const now = Date.now();
  const isGlobalFinance = (
    (globalGrants ?? []) as Array<{
      revoked_at: string | null;
      starts_at: string;
      ends_at: string | null;
      roles: { key: string };
    }>
  ).some((r) => {
    if (r.roles.key !== 'finance' && r.roles.key !== 'mainstream_admin') return false;
    if (r.revoked_at) return false;
    if (new Date(r.starts_at).getTime() > now) return false;
    if (r.ends_at && new Date(r.ends_at).getTime() <= now) return false;
    return true;
  });

  // Event Groups are mainstream-only lenses — RLS on finance.groups
  // filters this list down to nothing for branch finance users, so we
  // fetch unconditionally and let the sidebar hide its own section
  // when the list is empty.
  const sidebarGroups = await loadSidebarGroups();

  return (
    <AppShell
      persona="finance"
      userEmail={userEmail}
      userName={userName}
      avatarUrl={profile?.avatar_url ?? undefined}
      isGlobalFinance={isGlobalFinance}
      sidebarGroups={sidebarGroups}
    >
      {/* Wraps the whole persona rather than each table, so the blur
          survives moving between Transactions, a charge and back — a
          presentation is not one page. */}
      <PrivacyProvider>{children}</PrivacyProvider>
    </AppShell>
  );
}
