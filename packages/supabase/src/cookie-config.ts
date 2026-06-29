/**
 * Cross-subdomain Supabase Auth cookie configuration.
 *
 * This is the load-bearing piece of Shesa's "log in once at
 * auth.shesa.org, stay logged in across web/exco/finance/connect" UX.
 * Per ADR-0014, the Supabase Auth session cookie is set with:
 *
 *   - `domain=.shesa.org`         → readable by every Shesa subdomain
 *   - `httpOnly: true`            → JS can never read it (XSS-resistant)
 *   - `secure: true`              → only sent over HTTPS
 *   - `sameSite: 'lax'`           → safe default, cross-site GET OK
 *
 * Local dev (`localhost:<port>`) is intentionally NOT scoped with a
 * leading dot — browsers refuse to set a domain attribute on `localhost`
 * cookies, and per-port cookies are the only thing that works there.
 *
 * The `apps/auth` callback writes the cookie; every other app's
 * middleware reads it (via `@supabase/ssr`'s `createServerClient`).
 */

import { serverEnv } from '@shesa/config/env.server';

export interface CookieAttributes {
  domain?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
}

/**
 * Resolve the cookie attributes the Supabase Auth session should be
 * written with, given the runtime environment.
 *
 * Local: omit `domain` and `secure` so cookies actually persist over
 * http://localhost (browsers refuse `Secure` on http).
 *
 * Staging / prod: scope to the apex domain so every subdomain sees the
 * session.
 */
export function authCookieAttributes(): CookieAttributes {
  const isLocal = serverEnv.APP_ENV === 'local';
  return {
    domain: isLocal ? undefined : `.${serverEnv.APP_BASE_DOMAIN}`,
    httpOnly: true,
    secure: !isLocal,
    sameSite: 'lax',
    path: '/',
  };
}
