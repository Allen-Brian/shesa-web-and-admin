/**
 * Browser-side Supabase client.
 *
 * Used by client components and plain React apps. Reads from the
 * Supabase Auth cookie set server-side at `apps/auth` (the cookie's
 * apex-domain scoping makes it visible here on any Shesa subdomain
 * — see `cookie-config.ts`).
 *
 * Only the anon key is exposed in the browser. RLS enforces access;
 * the service-role client is server-only and is exported from
 * `./service-role`, NOT from this file.
 */

import { createBrowserClient as ssrCreateBrowserClient } from '@supabase/ssr';
import { clientEnv } from '@shesa/config/env.client';

import type { Database } from './types.gen';

export function createBrowserClient() {
  return ssrCreateBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
