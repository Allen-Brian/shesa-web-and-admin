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
 * scopes to the apex domain (`.shesaconnect.com` in staging/prod,
 * `.shesa.test` in local), the session cookie is immediately visible
 * to every other Shesa hostname — right now that's just
 * `web.shesaconnect.com`, kept apex-scoped for the future.
 *
 * After exchange:
 *   - Success → redirect to the URL named in the `next` param (default
 *     `/` which triggers the persona resolver in
 *     apps/admin/src/app/page.tsx).
 *   - Failure → redirect to `/login?error=auth_failed` with a generic
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
    return redirectToLogin(url, 'missing_code');
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'admin.auth.callback',
        message: 'exchangeCodeForSession failed',
        error: error.message,
      }),
    );
    return redirectToLogin(url, 'auth_failed');
  }

  // The cookies have been set on the response that supabase-ssr is
  // currently composing. Returning a redirect carries them along — the
  // browser stores the cookie and follows to `next` (which `safeRedirect`
  // has already constrained to the apex domain).
  return NextResponse.redirect(new URL(next, url.origin), { status: 303 });
}

function redirectToLogin(currentUrl: URL, code: string): NextResponse {
  const dest = new URL('/login', currentUrl.origin);
  dest.searchParams.set('error', code);
  return NextResponse.redirect(dest, { status: 303 });
}
