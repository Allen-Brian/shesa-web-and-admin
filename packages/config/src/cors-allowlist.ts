/**
 * Canonical CORS allowlist for Shesa's cross-origin surfaces.
 *
 * Two consumers today:
 *   1. `apps/auth/src/app/api/session/route.ts` — the SPA session bridge
 *      (ADR-0035). Vite SPAs at `exco.*` / `finance.*` origin-check into
 *      this endpoint to hydrate their session store.
 *   2. `supabase/functions/_shared/cors.ts` — Edge Function preflight
 *      and response CORS headers, for direct-from-browser mutations.
 *
 * The Edge Function copy is duplicated (Deno import paths don't reach
 * into `packages/config` reliably). Keep them in sync — the Edge
 * Function file has a "KEEP IN SYNC WITH …" comment pointing here.
 *
 * Explicit hostnames, NOT wildcards. A credentialed `staging-*.…`
 * wildcard trusts any DNS name someone could stand up under that
 * prefix; the surface isn't worth the risk when the list is 12 items
 * and rarely changes.
 */

import type { EnvironmentName } from '@shesa/types';

const LOCAL_ORIGINS = [
  'http://web.shesa.test:3000',
  'http://auth.shesa.test:3001',
  'http://exco.shesa.test:3002',
  'http://finance.shesa.test:3003',
  // Bare localhost fallbacks — some Docker/browser combos hit these
  // rather than the /etc/hosts alias.
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  // Supabase Functions dev runner.
  'http://127.0.0.1:54321',
] as const;

const STAGING_ORIGINS = [
  'https://staging.shesaconnect.com',
  'https://staging-auth.shesaconnect.com',
  'https://staging-exco.shesaconnect.com',
  'https://staging-finance.shesaconnect.com',
] as const;

const PRODUCTION_ORIGINS = [
  'https://shesaconnect.com',
  'https://www.shesaconnect.com',
  'https://auth.shesaconnect.com',
  'https://exco.shesaconnect.com',
  'https://finance.shesaconnect.com',
] as const;

/**
 * Return the allowlist for a given env. Non-local envs include
 * staging + production together on purpose — the two share the
 * `.shesaconnect.com` apex (see memory `project_domains.md`), and a
 * request from `staging-exco.shesaconnect.com` may legitimately hit
 * a shared function during a preview. If envs need hard isolation
 * later, split by APP_ENV here.
 */
export function corsAllowlistFor(env: EnvironmentName): readonly string[] {
  if (env === 'local') return LOCAL_ORIGINS;
  return [...STAGING_ORIGINS, ...PRODUCTION_ORIGINS];
}

export function isAllowedOrigin(origin: string | null, env: EnvironmentName): boolean {
  if (!origin) return false;
  return corsAllowlistFor(env).includes(origin);
}
