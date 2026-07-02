/**
 * Session bridge client — talks to `/api/session` on apps/auth and
 * to the `get-my-grants` Edge Function on Supabase. See ADR-0035.
 *
 * These two calls are the entire seam between the httpOnly-cookie
 * world (auth app + Supabase Auth) and the JS-side session state the
 * SPA maintains.
 */

import { clientEnv } from '@shesa/config/env.client';

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface SessionPayload {
  user: SessionUser | null;
  expiresAt: string | null;
  accessToken: string | null;
}

export interface Grant {
  scopeId: string | null;
  scopeType: string;
  scopeName: string;
  roleKey: string;
  permissionKeys: string[];
}

/**
 * Fetch the current session from apps/auth. `credentials: 'include'`
 * forwards the apex-scoped httpOnly cookie that apps/auth wrote.
 *
 * Returns `null` on a 401 (no session). Throws on network / 5xx —
 * callers should treat that as "cannot verify session, redirect to
 * login".
 */
export async function fetchSession(): Promise<SessionPayload | null> {
  const res = await fetch(`${clientEnv.NEXT_PUBLIC_AUTH_APP_URL}/api/session`, {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error(`fetchSession failed: HTTP ${res.status}`);
  }

  const body = (await res.json()) as SessionPayload;
  return body;
}

/**
 * Fetch the caller's active grants from the `get-my-grants` Edge
 * Function. Called after `fetchSession` yields an authenticated user.
 *
 * `accessToken` is the JWT from `/api/session` — Edge Functions
 * require it in the Authorization header (they can't read cookies).
 */
export async function fetchGrants(accessToken: string): Promise<Grant[]> {
  const res = await fetch(`${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-my-grants`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      apikey: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'content-type': 'application/json',
    },
    body: '{}',
  });

  if (!res.ok) {
    throw new Error(`fetchGrants failed: HTTP ${res.status}`);
  }

  const body = (await res.json()) as { grants: Grant[] };
  return body.grants ?? [];
}
