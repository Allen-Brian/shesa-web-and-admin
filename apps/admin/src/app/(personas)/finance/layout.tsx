import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function FinanceLayout({ children }: { readonly children: ReactNode }) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/finance');
  }

  const { data: profile } = await supabase
    .schema('core')
    .from('profiles')
    .select('display_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const userEmail = profile?.email ?? user.email ?? '';
  const userName = profile?.display_name ?? userEmail.split('@')[0] ?? 'User';

  return (
    <AppShell
      persona="finance"
      userEmail={userEmail}
      userName={userName}
      avatarUrl={profile?.avatar_url ?? undefined}
    >
      {children}
    </AppShell>
  );
}
