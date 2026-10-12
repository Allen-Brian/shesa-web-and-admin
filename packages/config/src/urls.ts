/**
 * Public URL helpers — derived from `clientEnv`, safe in any bundle.
 *
 * Post-pivot (ADR-0040): two apps only — `web` (public marketing +
 * eventual CMS-rendered content) and `admin` (Next.js hosting Exco /
 * Finance / Editor personas). The retired apps/auth/exco/finance URL
 * entries are gone.
 */

import { clientEnv } from './env.client';

export const appUrls = {
  web: clientEnv.NEXT_PUBLIC_WEB_APP_URL,
  admin: clientEnv.NEXT_PUBLIC_ADMIN_APP_URL,
} as const;

export type AppUrlKey = keyof typeof appUrls;

/**
 * The apex domain used to scope the Supabase Auth cookie.
 *
 * In staging/prod this is `shesaconnect.com`; the Supabase cookie is
 * set with `domain=.shesaconnect.com` for cross-subdomain read access
 * (kept future-proof even though `apps/web` no longer consumes it in
 * Phase 2). Staging + prod share the apex per memory `project_domains.md`.
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
