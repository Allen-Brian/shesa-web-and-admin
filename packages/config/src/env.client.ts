/**
 * Client-safe environment.
 *
 * Schema covers ONLY `NEXT_PUBLIC_*` vars. These end up in client bundles
 * by design — never put a secret here.
 *
 * Validated at module load; a missing or malformed var fails the build
 * (and `next dev` boot), which is what we want over a silent runtime error.
 */

import { z } from 'zod';
import { ENVIRONMENT_NAMES } from '@shesa/types';

const clientEnvSchema = z.object({
  /** App env name — `local` / `staging` / `production`. */
  NEXT_PUBLIC_APP_ENV: z.enum(ENVIRONMENT_NAMES),

  /** Apex domain shared by every Shesa app (e.g. `shesa.org`). Used to scope
   *  the Supabase Auth cookie so login at `auth.shesa.org` is visible to
   *  `web.shesa.org`, `finance.shesa.org`, etc. — see ADR-0014. */
  NEXT_PUBLIC_APP_BASE_DOMAIN: z.string().min(1),

  /** Supabase project URL. Public — anon key + RLS protects data. */
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),

  /** Supabase anon key. Public — the service-role key is in `env.server`. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  /** Per-app public URLs (used for cross-app links in the UI).
   *  apps/connect was dropped from Phase 0; if it returns later, add it
   *  back here AND in scripts/env-spec.mjs in lockstep. */
  NEXT_PUBLIC_WEB_APP_URL: z.string().url(),
  NEXT_PUBLIC_AUTH_APP_URL: z.string().url(),
  NEXT_PUBLIC_EXCO_APP_URL: z.string().url(),
  NEXT_PUBLIC_FINANCE_APP_URL: z.string().url(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Parse once. Re-parsing on every import would (a) waste cycles and
 * (b) make missing-var failures surface at random first-use rather than
 * at boot.
 *
 * We pass `process.env` (Next inlines `NEXT_PUBLIC_*` at build time, so
 * this works in both server and browser bundles).
 */
export const clientEnv: ClientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_APP_BASE_DOMAIN: process.env.NEXT_PUBLIC_APP_BASE_DOMAIN,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
  NEXT_PUBLIC_AUTH_APP_URL: process.env.NEXT_PUBLIC_AUTH_APP_URL,
  NEXT_PUBLIC_EXCO_APP_URL: process.env.NEXT_PUBLIC_EXCO_APP_URL,
  NEXT_PUBLIC_FINANCE_APP_URL: process.env.NEXT_PUBLIC_FINANCE_APP_URL,
});
