/**
 * Canonical CORS allowlist — collapsed to admin's own origin per env
 * after the Phase 2 pivot (ADR-0040 supersedes ADR-0035).
 *
 * Rationale: the pivot retired `apps/auth` (which owned the
 * credentialed cross-origin `/api/session` endpoint) and merged the
 * two Vite SPAs into a Next.js `apps/admin`. Every authenticated write
 * from admin now runs through Server Actions — same-origin — so no
 * browser-side call crosses an origin at all. `apps/web` stays public
 * (no authenticated calls). The only origin that remains in the
 * allowlist is `apps/admin` per env, kept for the rare case of a
 * client component calling an Edge Function directly.
 *
 * Consumer today:
 *   1. `supabase/functions/_shared/cors.ts` — Edge Function preflight +
 *      response CORS headers. The Deno-side file duplicates this list
 *      (KEEP IN SYNC comment there points here).
 *
 * If a future flow needs a wider allowlist (e.g. a public form on
 * `apps/web` posting to an Edge Function), add the specific entry then.
 * No pre-provisioning.
 */

import type { EnvironmentName } from '@shesa/types';

const LOCAL_ORIGINS = [
  'http://admin.shesa.test:3002',
  'http://localhost:3002',
  // Supabase Functions dev runner.
  'http://127.0.0.1:54321',
] as const;

const STAGING_ORIGINS = ['https://staging-admin.shesaconnect.com'] as const;

const PRODUCTION_ORIGINS = ['https://admin.shesaconnect.com'] as const;

export function corsAllowlistFor(env: EnvironmentName): readonly string[] {
  if (env === 'local') return LOCAL_ORIGINS;
  return [...STAGING_ORIGINS, ...PRODUCTION_ORIGINS];
}

export function isAllowedOrigin(origin: string | null, env: EnvironmentName): boolean {
  if (!origin) return false;
  return corsAllowlistFor(env).includes(origin);
}
