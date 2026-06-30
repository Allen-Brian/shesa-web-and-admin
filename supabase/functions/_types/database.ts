/**
 * Database types for Edge Functions.
 *
 * Mirror of `packages/supabase/src/types.gen.ts`. We can't import the
 * monorepo package directly from a Deno Edge Function (different
 * runtime, different module resolution), so the types either live here
 * as a copy OR (preferred long-term) the migration generator writes
 * BOTH `packages/supabase/src/types.gen.ts` AND this file from a single
 * `supabase gen types` invocation.
 *
 * For now (Phase 0): empty shape — same as the Node mirror. The first
 * Edge Function that needs real DB types triggers a follow-up to
 * dual-generate.
 */

export interface Database {
  // Populated when `supabase gen types` is wired to write here too.
}
