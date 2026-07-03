/**
 * Logout Route Handler — POST-only.
 *
 * POST-only: a GET logout would let a malicious link or pre-fetcher
 * end the user's session by accident. POSTs from cross-site links
 * don't fire without the user submitting a form, which is enough
 * CSRF protection for an idempotent "end my session" operation.
 *
 * Idempotent — if the user is already signed out, `signOut` is a no-op.
 * Always returns a 303 redirect to `/login?notice=signed_out`.
 */

import { NextResponse } from 'next/server';

import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = await getServerClient();
  await supabase.auth.signOut();

  const dest = new URL('/login?notice=signed_out', new URL(req.url).origin);
  // 303 so the browser follows with GET regardless of the original
  // method — standard pattern for a POST→redirect handoff.
  return NextResponse.redirect(dest, { status: 303 });
}
