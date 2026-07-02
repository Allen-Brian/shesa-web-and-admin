/**
 * Auth-app middleware.
 *
 * Runs on every request that isn't static / Next-internal. Its only job
 * is to call `supabase.auth.getUser()` which transparently refreshes
 * an expired access token using the refresh token in the cookie. The
 * refresh writes new cookies back to the response — without this,
 * users would be silently signed out the moment their access token
 * (default 1h) expires.
 *
 * apps/auth is the public entry point — there are no protected pages
 * here (the login page must be reachable while unauthenticated). So
 * no redirect logic — just refresh + pass through. The OTHER Shesa
 * apps (web, exco, finance) either have their own middleware
 * (Next.js apps) or a session-bridge fetch (Vite SPAs, see ADR-0035)
 * that redirects to auth.shesaconnect.com when no session is present.
 *
 * Cookie handling: every set/refresh goes through
 * `packages/supabase/src/cookie-config.ts` which scopes the cookie to
 * the apex domain (`.shesaconnect.com` in staging/prod, `.shesa.test`
 * in local) — that's what makes the session visible across
 * subdomains.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { createMiddlewareClient } from '@shesa/supabase/middleware';

export async function middleware(req: NextRequest) {
  // Build the response first; the Supabase client writes any refreshed
  // cookies onto its `cookies` adapter, which forwards to this response.
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createMiddlewareClient(
    { cookies: { getAll: () => req.cookies.getAll() } },
    { cookies: { set: (options) => res.cookies.set(options) } },
  );

  // The side effect (refresh) is the point. We don't gate on the user
  // here — every page in this app is public to unauthenticated users.
  await supabase.auth.getUser();

  return res;
}

/**
 * Run on every request EXCEPT static assets, Next internals, and the
 * favicon. The matcher is Next's recommended pattern — anything that
 * isn't matched here flows through without touching the Supabase
 * client, keeping image / font requests fast.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
