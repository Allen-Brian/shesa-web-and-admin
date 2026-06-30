/**
 * Auth callback Route Handler.
 *
 * Supabase Auth redirects here after the user clicks a magic-link
 * email, completes an OAuth flow, or otherwise completes an exchange
 * that needs to mint a session. The `code` query param is a one-time
 * authorization code; we exchange it for an access + refresh token
 * pair, which `@supabase/ssr`'s `exchangeCodeForSession` writes into
 * cookies via the adapter we wired up in `getServerClient`.
 *
 * Because the cookie-config (`packages/supabase/src/cookie-config.ts`)
 * scopes to the apex domain (`.shesa.org` in staging/prod, no domain
 * in local), the session cookie is immediately visible to every other
 * Shesa subdomain (`web.shesa.org`, `finance.shesa.org`, etc.). The
 * "log in once, signed in everywhere" property of Shesa rides on this
 * one Route Handler getting the cookie write right.
 *
 * After exchange:
 *   - Success → redirect to the URL named in the `next` param (default
 *     to the auth app's home), letting the caller (Supabase Auth's
 *     redirect_to) control the landing page.
 *   - Failure → redirect to `/?error=auth_failed` with a generic
 *     message. The detailed error is logged but not surfaced — auth
 *     errors are common attacker probes; we don't help them
 *     enumerate.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@shesa/config/env.server';

import { getServerClient } from '@/lib/supabase-server';
import { safeRedirect } from '@/lib/safe-redirect';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = safeRedirect(url.searchParams.get('next'), serverEnv.APP_BASE_DOMAIN);

  if (!code) {
    return redirectWithError(url, next, 'missing_code');
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'auth.callback',
        message: 'exchangeCodeForSession failed',
        error: error.message,
      }),
    );
    return redirectWithError(url, next, 'auth_failed');
  }

  // The cookies have been set on the response that supabase-ssr is
  // currently composing. Returning a redirect carries them along — the
  // browser stores the cookie and follows to `next` (which `safeRedirect`
  // has already constrained to the apex domain).
  return NextResponse.redirect(new URL(next, url.origin), { status: 303 });
}

function redirectWithError(currentUrl: URL, next: string, code: string): NextResponse {
  const dest = new URL(next, currentUrl.origin);
  dest.searchParams.set('error', code);
  return NextResponse.redirect(dest, { status: 303 });
}
