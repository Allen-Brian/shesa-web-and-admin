/**
 * Public URL helpers — derived from `clientEnv`, safe in any bundle.
 *
 * Use these in components and Server Actions for cross-app links
 * (e.g. "log out" redirects from any app back to the central auth app)
 * rather than hardcoding URLs scattered across the codebase.
 */

import { clientEnv } from './env.client';

export const appUrls = {
  web: clientEnv.NEXT_PUBLIC_WEB_APP_URL,
  auth: clientEnv.NEXT_PUBLIC_AUTH_APP_URL,
  exco: clientEnv.NEXT_PUBLIC_EXCO_APP_URL,
  finance: clientEnv.NEXT_PUBLIC_FINANCE_APP_URL,
} as const;

export type AppUrlKey = keyof typeof appUrls;

/**
 * The apex domain used to scope the shared Supabase Auth cookie.
 *
 * In staging/prod this is the bare domain (e.g. `shesa.org`); the
 * Supabase cookie is set with `domain=.shesa.org` for cross-subdomain
 * read access.
 *
 * In local dev (`localhost` / `127.0.0.1`) cookie-domain scoping doesn't
 * apply — every dev port is its own "site" to the browser. Components
 * that compose cross-subdomain URLs handle that case explicitly.
 */
export const appBaseDomain = clientEnv.NEXT_PUBLIC_APP_BASE_DOMAIN;

/**
 * True when we're running against a local Supabase CLI / Next dev server.
 * Use to gate behavior that only makes sense outside production
 * (verbose logs, test-only fixtures, etc.).
 */
export const isLocalEnv = clientEnv.NEXT_PUBLIC_APP_ENV === 'local';
