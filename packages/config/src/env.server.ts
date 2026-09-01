/**
 * Server-only environment.
 *
 * SECURITY: This file MUST NEVER be imported from client code. Doing so
 * bundles the service-role key, Supabase DB URL, Resend API key, etc.
 * into the browser. The single import path `@shesa/config/env.server`
 * makes this easy to spot in review and to enforce via ESLint
 * `no-restricted-imports` in apps' client trees (added in E10).
 *
 * Validated at module load — a missing or malformed server var fails boot
 * rather than surfacing at first runtime use.
 */

import { z } from 'zod';
import { ENVIRONMENT_NAMES } from '@shesa/types';

const serverEnvSchema = z.object({
  /** App env name. Mirrors `NEXT_PUBLIC_APP_ENV` — keep them aligned. */
  APP_ENV: z.enum(ENVIRONMENT_NAMES),

  /** Apex domain. Used by `packages/supabase` to scope the auth cookie. */
  APP_BASE_DOMAIN: z.string().min(1),

  /** Supabase project URL (server access path; same value as client URL). */
  SUPABASE_URL: z.string().url(),

  /** Supabase anon key (server can use it too — RLS still applies). */
  SUPABASE_ANON_KEY: z.string().min(1),

  /** Service-role key — bypasses RLS. Server-only. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  /** Direct Postgres connection URL for migrations / pg_cron setup. Server-only. */
  SUPABASE_DB_URL: z.string().url(),

  /** Resend API key for transactional email. Server-only. */
  RESEND_API_KEY: z.string().min(1),

  /** Default `From:` address for outbound mail. Resend accepts both a
   *  bare address (`dev@shesa.test`) and the SMTP-standard display-name
   *  form (`Shesa Dev <dev@shesa.test>`), so `.email()` is too strict —
   *  we just require non-empty and trust the provider's parser. */
  EMAIL_FROM: z.string().min(1),

  /** SMS provider mode — Phase 0 uses the stub log adapter. */
  SMS_PROVIDER_MODE: z.enum(['stub', 'live']).default('stub'),

  /* ── Fapshi (Cameroon MoMo/card gateway) ──────────────────────────
   * Optional on purpose. Only the public AGM payment flows in apps/web
   * touch Fapshi, but this schema is loaded by every app through
   * packages/supabase — making these required would fail admin's boot
   * over credentials it has no use for. The payment path asserts them
   * at point of use instead (see apps/web/src/lib/fapshi.ts).
   * ---------------------------------------------------------------- */

  /** `https://sandbox.fapshi.com` or `https://live.fapshi.com`. */
  FAPSHI_BASE_URL: z.string().url().optional(),

  /** Service `apiuser` from the Fapshi dashboard. */
  FAPSHI_API_USER: z.string().min(1).optional(),

  /** Service `apikey` from the Fapshi dashboard. Secret. */
  FAPSHI_API_KEY: z.string().min(1).optional(),

  /** Public HTTPS origin Fapshi returns the payer to after checkout.
   *  Falls back to `NEXT_PUBLIC_WEB_APP_URL` when unset. */
  FAPSHI_RETURN_URL_BASE: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Parse once. See `env.client.ts` for why.
 *
 * In Edge Functions (Deno) `process.env` doesn't exist — those callers
 * use `Deno.env.get(...)` directly and don't import this module.
 */
export const serverEnv: ServerEnv = serverEnvSchema.parse({
  APP_ENV: process.env.APP_ENV,
  APP_BASE_DOMAIN: process.env.APP_BASE_DOMAIN,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  SMS_PROVIDER_MODE: process.env.SMS_PROVIDER_MODE,
  FAPSHI_BASE_URL: process.env.FAPSHI_BASE_URL,
  FAPSHI_API_USER: process.env.FAPSHI_API_USER,
  FAPSHI_API_KEY: process.env.FAPSHI_API_KEY,
  FAPSHI_RETURN_URL_BASE: process.env.FAPSHI_RETURN_URL_BASE,
});
