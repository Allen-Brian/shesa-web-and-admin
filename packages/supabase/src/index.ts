/**
 * @shesa/supabase — Supabase client factories.
 *
 * Prefer the SUBPATH imports over this barrel — they let bundlers
 * tree-shake the client kinds the consumer doesn't need:
 *
 *   import { createBrowserClient } from '@shesa/supabase/browser';
 *   import { createServerClient } from '@shesa/supabase/server';
 *   import { createMiddlewareClient } from '@shesa/supabase/middleware';
 *   import { createServiceRoleClient } from '@shesa/supabase/service-role';
 *
 * The service-role client is server-only and must NEVER be imported in
 * browser code. Because this barrel re-exports it, the barrel itself is
 * banned from client components — `shesa/no-server-imports-in-client`
 * reports it and points at `@shesa/supabase/browser`.
 */

export type { Database } from './types.gen';
