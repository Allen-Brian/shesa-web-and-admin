/**
 * SERVER-ONLY: Supabase client with the service-role key.
 *
 * ⚠️ This client BYPASSES Row-Level Security. It must NEVER be imported
 * from client code, client components, plain React apps, or anywhere
 * else that ends up in a browser bundle.
 *
 * Permitted call sites:
 *   - Next.js Server Actions (`'use server'` files)
 *   - Next.js Route Handlers (`route.ts`)
 *   - Supabase Edge Functions
 *   - Node scripts run from CI / a worker container
 *
 * The single-file isolation here is so the ESLint `no-restricted-imports`
 * rule (added in E10) can ban `@shesa/supabase/service-role` from any
 * file under an app's client tree (any client component file living
 * inside `apps/<name>/src/app`, for example) with one path-pattern rule.
 *
 * If you need this in a Server Action: import it directly via the
 * subpath. If you find yourself reaching for it elsewhere — stop, and
 * check whether the operation should run as the authenticated user
 * (use `@shesa/supabase/server`) or genuinely needs to bypass RLS
 * (a few finance/admin operations do).
 */

import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@shesa/config/env.server';

import type { Database } from './types.gen';

export function createServiceRoleClient() {
  return createClient<Database>(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // Service-role clients never persist a session — they're per-call,
      // and `setSession` on the global instance would be a footgun.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
