/**
 * Admin-app middleware.
 *
 * Runs on every non-static request. Two jobs:
 *   1. Refresh the session via `supabase.auth.getUser()` so expired
 *      access tokens get silently rotated using the refresh token in
 *      the apex-scoped cookie.
 *   2. Gate persona routes — anything under `/exco`, `/finance`,
 *      `/editor` requires a session; unauthenticated visits redirect
 *      to `/login?next=<original>`.
 *
 * Auth routes (`/login`, `/forgot-password`, `/reset-password`,
 * `/callback`, `/logout`) stay public — the middleware still refreshes
 * the session on them but never redirects away.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createMiddlewareClient } from '@shesa/supabase/middleware';

const PUBLIC_PATHS = new Set([
  '/login',
  '/forgot-password',
  '/reset-password',
  '/callback',
  '/logout',
  '/verify',
]);

const PERSONA_PREFIXES = ['/exco', '/finance', '/editor'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createMiddlewareClient(
    { cookies: { getAll: () => req.cookies.getAll() } },
    { cookies: { set: (options) => res.cookies.set(options) } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.has(pathname);
  const isPersonaPath = PERSONA_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isRoot = pathname === '/';

  if (!user && (isPersonaPath || isRoot) && !isPublic) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    const homeUrl = req.nextUrl.clone();
    // Persona resolution happens in the root page; middleware just
    // punts landed-users at `/` into the (personas) tree via `/`.
    if (pathname === '/login') {
      homeUrl.pathname = '/';
      homeUrl.search = '';
      return NextResponse.redirect(homeUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
