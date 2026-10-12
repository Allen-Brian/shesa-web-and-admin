/**
 * Root landing — persona resolver.
 *
 * Middleware guarantees an authenticated user by the time we reach
 * this page (unauthenticated hits `/` redirect to `/login`). Here we
 * resolve which persona to land the user in and 302 there.
 *
 * The full persona resolution (grant-weighted heuristic + tie-break)
 * lands in E2.pivot.E with the persona system. For the E2.pivot.B
 * scaffold we just check the user's `preferred_persona` on the
 * profile and route accordingly; if it's null we default to `/exco`
 * as a placeholder — this is replaced by the real resolver in E.
 */

import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .schema('core')
    .from('profiles')
    .select('preferred_persona')
    .eq('id', user.id)
    .maybeSingle();

  const persona = profile?.preferred_persona ?? 'exco';
  redirect(`/${persona}`);
}
