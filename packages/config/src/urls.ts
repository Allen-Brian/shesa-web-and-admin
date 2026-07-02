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
 * In staging/prod this is `shesaconnect.com`; the Supabase cookie is
 * set with `domain=.shesaconnect.com` for cross-subdomain read access.
 * Staging and prod share the apex (staging uses sibling hostnames like
 * `staging-auth.shesaconnect.com`), so a cookie set in one env is
 * technically visible in the other — deliberate trade-off, see
 * memory `project_domains.md`.
 *
 * In local dev (`shesa.test` via /etc/hosts) cookie-domain scoping
 * applies but Secure is dropped since the runtime is http.
 */
export const appBaseDomain = clientEnv.NEXT_PUBLIC_APP_BASE_DOMAIN;

/**
 * True when we're running against a local Supabase CLI / Next dev server.
 * Use to gate behavior that only makes sense outside production
 * (verbose logs, test-only fixtures, etc.).
 */
export const isLocalEnv = clientEnv.NEXT_PUBLIC_APP_ENV === 'local';
