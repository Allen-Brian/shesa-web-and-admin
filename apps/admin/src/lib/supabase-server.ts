/**
 * Wraps `@shesa/supabase/server` with Next.js's `cookies()` store.
 * Used by Server Components and Server Actions in the admin app to
 * read the apex-scoped session cookie server-side (ADR-0014, ADR-0040).
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
