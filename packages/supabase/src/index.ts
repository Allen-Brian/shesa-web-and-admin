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
 * browser code — enforced via ESLint `no-restricted-imports` in apps
 * (added in E10).
 */

export type { Database } from './types.gen';
