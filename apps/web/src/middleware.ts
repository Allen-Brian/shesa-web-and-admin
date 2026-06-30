/**
 * Web-app middleware.
 *
 * Mirror of apps/auth/src/middleware.ts: refresh the session on every
 * request via `supabase.auth.getUser()` so expired access tokens get
 * silently rotated using the refresh token in the cookie.
 *
 * Like the auth app, web is mostly PUBLIC — the homepage / CMS-rendered
 * content reachable without a session. We do NOT redirect-when-no-session
 * here. The CMS admin routes (Phase 5) will add their own gate.
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
