/**
 * Logout Route Handler — POST-only.
 *
 * Each Shesa app SHOULD eventually have its own logout Server Action
 * (E10) because the shared apex-scoped cookie is clearable from any
 * subdomain. This handler exists for the auth app itself and as a
 * fallback target for apps that haven't wired their own action yet.
 *
 * POST-only: a GET logout would let a malicious link or pre-fetcher
 * end the user's session by accident. POSTs from cross-site links
 * don't fire without the user submitting a form, which is enough
 * CSRF protection for an idempotent "end my session" operation.
 *
 * Idempotent — if the user is already signed out, `signOut` is a no-op.
 * Always returns a 303 redirect to the login page with a notice.
 */

import { NextResponse } from 'next/server';

import { getServerClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = await getServerClient();
  await supabase.auth.signOut();

  const dest = new URL('/?notice=signed_out', new URL(req.url).origin);
  // Use 303 so the browser follows with GET regardless of the original
  // method — standard pattern for a POST→redirect handoff.
  return NextResponse.redirect(dest, { status: 303 });
}
