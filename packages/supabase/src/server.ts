/**
 * Server-side Supabase client for Server Components, Server Actions,
 * Route Handlers.
 *
 * Uses `@supabase/ssr`'s `createServerClient` with a cookie adapter that:
 *
 *   - Reads cookies from Next's `cookies()` store (passed in by the caller).
 *   - Writes cookies with apex-domain scope so the session is shared
 *     across every Shesa subdomain (see `cookie-config.ts`).
 *
 * The caller passes in `cookies()` from `next/headers` rather than this
 * package importing it directly — that keeps `@shesa/supabase` free of a
 * Next runtime dep and reusable from anywhere a `CookieStore` exists.
 */

import { createServerClient as ssrCreateServerClient, type CookieOptions } from '@supabase/ssr';
import { serverEnv } from '@shesa/config/env.server';

import { authCookieAttributes } from './cookie-config';
import type { Database } from './types.gen';

/**
 * Shape of the cookie batches `@supabase/ssr` hands to `setAll`. Typed
 * explicitly because strict TS won't infer the parameter through our
 * structural `ServerCookieStore` adapter.
 */
type CookieBatch = { name: string; value: string; options: CookieOptions };

/**
 * Minimal shape of Next's `ReadonlyRequestCookies`. We only need
 * `getAll` and `set` — Supabase SSR uses the bulk getAll/setAll
 * adapter introduced in `@supabase/ssr@0.4+`.
 */
export interface ServerCookieStore {
  getAll(): { name: string; value: string }[];
  set(options: {
    name: string;
    value: string;
    domain?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
    maxAge?: number;
    expires?: Date;
  }): void;
}

export function createServerClient(cookieStore: ServerCookieStore) {
  const cookieAttrs = authCookieAttributes();

  return ssrCreateServerClient<Database>(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieBatch[]) {
        // Server Components can't set cookies — Next throws when
        // `cookies().set(...)` is called outside a Server Action /
        // Route Handler. Swallow that specific failure mode rather
        // than crashing every read; the next mutation will refresh
        // the cookie correctly.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set({
              ...options,
              name,
              value,
              domain: cookieAttrs.domain,
              httpOnly: cookieAttrs.httpOnly,
              secure: cookieAttrs.secure,
              sameSite: cookieAttrs.sameSite,
              path: cookieAttrs.path,
            });
          }
        } catch {
          // Read-only context (Server Component) — fine to ignore.
        }
      },
    },
  });
}
