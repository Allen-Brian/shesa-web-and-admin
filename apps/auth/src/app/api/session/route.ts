/**
 * SPA session bridge — see ADR-0035.
 *
 * The Vite SPAs (`apps/exco`, `apps/finance`) can't read the
 * apex-scoped httpOnly Supabase Auth cookie from JS. This handler
 * reads it server-side and returns `{ user, expiresAt, accessToken }`
 * as JSON so the SPA can (a) hydrate a session store and (b) send
 * `Authorization: Bearer <accessToken>` to Edge Functions.
 *
 * The REFRESH token stays in the httpOnly cookie — it's the long-lived
 * credential and XSS-exposing it would be catastrophic. The ACCESS
 * token is short-lived (~1h) and its exfiltration is bounded by that
 * TTL. When the access token expires, the SPA re-fetches this endpoint
 * and Supabase middleware refreshes the cookie server-side, returning
 * a fresh access token. See ADR-0035 §Consequences for the
 * XSS-damage-window analysis.
 *
 * NOT a permission list. Permissions come from the `get-my-grants`
 * Edge Function so identity probes stay cheap and grants have their
 * own invalidation lifecycle (refetched on role.granted / role.revoked
 * toasts and on window-focus after 5 min).
 */

import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@shesa/config/env.server';
import { isAllowedOrigin } from '@shesa/config/cors-allowlist';

import { getServerClient } from '@/lib/supabase-server';

interface SessionResponse {
  user: { id: string; email: string | null } | null;
  expiresAt: string | null;
  accessToken: string | null;
}

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && isAllowedOrigin(origin, serverEnv.APP_ENV) ? origin : '';
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req.headers.get('origin')),
  });
}

export async function GET(req: NextRequest) {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'));

  const supabase = await getServerClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'api.session',
        message: 'getSession failed',
        error: sessionError.message,
      }),
    );
    return respond({ user: null, expiresAt: null, accessToken: null }, 401, corsHeaders);
  }

  const session = sessionData.session;
  if (!session) {
    return respond({ user: null, expiresAt: null, accessToken: null }, 401, corsHeaders);
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const body: SessionResponse = {
    user: user ? { id: user.id, email: user.email ?? null } : null,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    accessToken: session.access_token,
  };

  return respond(body, user ? 200 : 401, corsHeaders);
}

function respond(body: SessionResponse, status: number, cors: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...cors,
      'cache-control': 'no-store',
    },
  });
}
