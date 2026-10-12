/**
 * Middleware helper for refreshing the Supabase Auth session on every
 * request — pattern from the official Supabase SSR docs.
 *
 * Apps call this from their `src/middleware.ts`; it returns the
 * `NextResponse` to send back. The function:
 *
 *   1. Pulls cookies from the incoming `NextRequest`.
 *   2. Builds a fresh Supabase server client with those cookies.
 *   3. Calls `auth.getUser()` — Supabase will silently refresh the
 *      access token if expired, writing new cookies to the response.
 *   4. Returns the response so Next can pipe the refreshed cookies back
 *      to the browser.
 *
 * Without this, expired access tokens are never refreshed in the
 * middleware path and the user gets booted to login despite having a
 * valid refresh token in the cookie.
 */

import { createServerClient as ssrCreateServerClient, type CookieOptions } from '@supabase/ssr';
import { serverEnv } from '@shesa/config/env.server';

import { authCookieAttributes } from './cookie-config';
import type { Database } from './types.gen';

/**
 * Shape of the cookie batches `@supabase/ssr` hands to `setAll`. Typed
 * explicitly because strict TS won't infer the parameter through our
 * structural request/response adapters.
 */
type CookieBatch = { name: string; value: string; options: CookieOptions };

/**
 * Subset of Next's `NextRequest` we need. Defined structurally so this
 * package doesn't take a hard dep on `next/server`.
 */
export interface MiddlewareRequest {
  cookies: {
    getAll(): { name: string; value: string }[];
  };
}

/**
 * Subset of Next's `NextResponse` we need.
 */
export interface MiddlewareResponse {
  cookies: {
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
  };
}

/**
 * Build a server client wired to the request's cookies, and write any
 * refreshed cookies onto the provided response.
 *
 * The middleware should `await client.auth.getUser()` after calling this,
 * then return `response`.
 */
export function createMiddlewareClient(request: MiddlewareRequest, response: MiddlewareResponse) {
  const cookieAttrs = authCookieAttributes();

  return ssrCreateServerClient<Database>(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieBatch[]) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set({
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
      },
    },
  });
}
