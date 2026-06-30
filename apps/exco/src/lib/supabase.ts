/**
 * Browser Supabase client for the exco SPA.
 * Same shape as apps/finance/src/lib/supabase.ts — see that file for
 * the SPA-vs-httpOnly-cookie tradeoff.
 */

import { createClient } from '@supabase/supabase-js';
import { clientEnv } from '@shesa/config/env.client';

export const supabase = createClient(
  clientEnv.NEXT_PUBLIC_SUPABASE_URL,
  clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
