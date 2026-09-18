import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell';
import { loadEditions } from '@/app/(personas)/editor/voting/load-voting';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Editor persona — curates public-website content (Leadership,
 * announcements copy, etc.). Single-scope: everything happens at
 * Mainstream. Non-editor users get redirected out.
 */
export default async function EditorLayout({ children }: { readonly children: ReactNode }) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/editor');
  }

  // `cms.edit` at any scope is the ticket in. Anyone without it (a
  // branch admin who somehow navigated here, a plain member, etc.) is
  // bounced back out. Uses the SECURITY DEFINER RPC — bypasses RLS on
  // the RBAC tables.
  const { data: allowedCms } = await supabase.schema('core').rpc('has_permission_at_any_scope', {
    p_user_id: user.id,
    p_key: 'cms.edit',
  });
  if (allowedCms !== true) {
    redirect('/');
  }

  const { data: profile } = await supabase
    .schema('core')
    .from('profiles')
    .select('display_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  // The Voting group lists the ceremonies. Read here rather than in the
  // sidebar because the sidebar is a client component, and the same way the
  // finance persona already supplies its event groups.
  const editions = await loadEditions();

  const userEmail = profile?.email ?? user.email ?? '';
  const userName = profile?.display_name ?? userEmail.split('@')[0] ?? 'User';

  return (
    <AppShell
      persona="editor"
      userEmail={userEmail}
      userName={userName}
      avatarUrl={profile?.avatar_url ?? undefined}
      canEditCms
      votingEditions={editions.map((e) => ({ slug: e.slug, name: e.name }))}
    >
      {children}
    </AppShell>
  );
}
