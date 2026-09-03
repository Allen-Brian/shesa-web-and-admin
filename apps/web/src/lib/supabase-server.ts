/**
 * Wraps `@shesa/supabase/server` with Next.js's `cookies()` store.
 *
 * Every read this client makes on the public site resolves through a CMS
 * policy granted identically to `anon` and `authenticated`, so a visitor's
 * session changes nothing about what renders. That is why `middleware.ts`
 * was removed in SEC-20: it called `supabase.auth.getUser()` on every
 * request — a round-trip to the Auth service per page view, on a site with
 * no auth-gated routes, which also forced every page to render dynamically
 * and defeated the SSG/ISR the architecture is built on. Nothing read the
 * session it refreshed. `apps/admin` keeps its own middleware and is where
 * token rotation belongs.
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
