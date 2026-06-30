/**
 * Browser Supabase client for the finance SPA.
 *
 * SPAs don't have access to the apex-scoped httpOnly cookie that
 * apps/auth writes — JS can't read httpOnly. For Phase 0 the SPAs are
 * placeholder shells with NO authenticated routes, so this client uses
 * supabase-js's default localStorage session (good for in-app sign-in
 * if we want to bolt one on).
 *
 * Phase 1+: introduce a session-bridge endpoint on apps/auth that
 * returns the tokens to a CORS-credentialed fetch from this SPA, then
 * call `client.auth.setSession(...)` so cross-app SSO works. Until then
 * each SPA's auth is independent — fine for placeholders.
 */

import { createClient } from '@supabase/supabase-js';
import { clientEnv } from '@shesa/config/env.client';

export const supabase = createClient(
  clientEnv.NEXT_PUBLIC_SUPABASE_URL,
  clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
