/**
 * Cross-subdomain Supabase Auth cookie configuration.
 *
 * This is the load-bearing piece of Shesa's "log in once at
 * auth.shesaconnect.com, stay logged in across web/exco/finance" UX.
 * Per ADR-0014, the Supabase Auth session cookie is set with:
 *
 *   - `domain=.shesaconnect.com`  → readable by every Shesa hostname
 *   - `httpOnly: true`            → JS can never read it (XSS-resistant)
 *   - `secure: true`              → only sent over HTTPS
 *   - `sameSite: 'lax'`           → safe default, cross-site GET OK
 *
 * Local dev uses `shesa.test` via /etc/hosts; the code below is
 * driven by APP_BASE_DOMAIN so a change of apex is a one-line env-var
 * edit, not a source change.
 *
 * The `apps/auth` callback writes the cookie; every other app's
 * middleware reads it (via `@supabase/ssr`'s `createServerClient`).
 * The SPA session bridge at `apps/auth/api/session` (ADR-0035)
 * surfaces the identity to Vite SPAs that can't read httpOnly cookies
 * directly.
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
