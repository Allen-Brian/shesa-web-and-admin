/**
 * Wraps `@shesa/supabase/server` with Next.js's `cookies()` store.
 * Mirror of apps/auth/src/lib/supabase-server.ts — kept per-app so any
 * web-specific cookie behavior (e.g. CMS preview-mode handoff) has one
 * place to land later.
 */

import { cookies } from 'next/headers';

import { createServerClient } from '@shesa/supabase/server';

export async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient({
    getAll: () => cookieStore.getAll(),
    set: (options) => {
      cookieStore.set(options);
    },
  });
}
