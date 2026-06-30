/**
 * Thin re-export for client components — adds nothing on top of
 * `@shesa/supabase/browser` for now, but the indirection means
 * future per-app customization (e.g. an auth-specific event handler)
 * has one place to land.
 */

export { createBrowserClient } from '@shesa/supabase/browser';
