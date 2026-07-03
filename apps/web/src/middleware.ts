/**
 * Web-app middleware.
 *
 * Refreshes the session on every request via `supabase.auth.getUser()`
 * so expired access tokens get silently rotated using the refresh token
 * in the apex-scoped cookie. If a user is signed in on admin, that
 * session flows here transparently — future Phase 5 CMS surfaces will
 * be able to read it without any additional plumbing.
 *
 * Post-pivot (ADR-0040): web is FULLY PUBLIC — no auth-gated routes.
 * Authoring lives on apps/admin under the Editor persona; web only
 * renders the published output (SSG/ISR). No redirect-when-no-session
 * here on purpose.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createMiddlewareClient } from '@shesa/supabase/middleware';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createMiddlewareClient(
    { cookies: { getAll: () => req.cookies.getAll() } },
    { cookies: { set: (options) => res.cookies.set(options) } },
  );

  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
