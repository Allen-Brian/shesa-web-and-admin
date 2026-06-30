/**
 * Wraps `@shesa/supabase/server` with Next.js's `cookies()` store.
 *
 * Every Server Action and Route Handler in apps/auth calls
 * `getServerClient()` rather than constructing a client manually —
 * keeps the cookie-store wiring (and the apex-domain scoping inside
 * `@shesa/supabase`) in one place.
 */

import { cookies } from 'next/headers';

import { createServerClient } from '@shesa/supabase/server';

export async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient({
    getAll: () => cookieStore.getAll(),
    set: (options) => {
      // Next's cookies().set() takes the same shape Supabase ssr
      // produces. Forwarding directly; the cookie-config in
      // packages/supabase already applied the apex-domain scope.
      cookieStore.set(options);
    },
  });
}
