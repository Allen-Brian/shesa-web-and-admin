/**
 * Supabase client factories for Edge Functions.
 *
 * Two flavors:
 *   - createUserClient(jwt) — runs queries AS the caller, RLS applies.
 *     Use this when the function is enforcing per-user authorization
 *     and needs to confirm the caller's reach through RLS.
 *   - createServiceRoleClient() — bypasses RLS. Use ONLY after the
 *     policy check has approved the operation and you need to write
 *     to tables the caller doesn't have direct grants on (e.g.
 *     audit.audit_entries, or another schema's tables for a
 *     cross-domain side effect).
 *
 * Edge Functions run in Deno; the Supabase client comes from the
 * `npm:` specifier. URL + keys come from the runtime env Supabase
 * injects automatically (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
 * `SUPABASE_SERVICE_ROLE_KEY`).
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.47.10';

import type { Database } from '../_types/database.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Edge Function env is missing one of SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY',
  );
}

/**
 * User-context client: queries run with the caller's JWT, RLS applies.
 *
 * The `jwt` arg is the access token extracted from the Authorization
 * header (Bearer <jwt>). Server Actions get it from `@supabase/ssr`
 * automatically and forward it.
 */
export function createUserClient(jwt: string): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl!, anonKey!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client: bypasses RLS. NEVER expose to a request whose
 * caller hasn't already been authorized at the policy layer.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
