/**
 * CORS handling for Edge Functions — collapsed to admin's origin per
 * env after the Phase 2 pivot (ADR-0040 supersedes ADR-0035).
 *
 * Server Actions on `apps/admin` are same-origin with Supabase, so no
 * browser-side call from admin crosses an origin. `apps/web` is public
 * (no authenticated calls). This list exists for the rare case of a
 * client component calling an Edge Function directly.
 *
 * ─── KEEP IN SYNC WITH packages/config/src/cors-allowlist.ts ────────
 * That module is the canonical list; this file duplicates it because
 * Deno-run Edge Functions can't reliably import from `packages/*`.
 * If you change one, change both.
 * ────────────────────────────────────────────────────────────────────
 */

const ALLOWED_ORIGINS = new Set<string>([
  // Local dev
  'http://admin.shesa.test:3002',
  'http://localhost:3002',
  'http://127.0.0.1:54321',
  // Staging
  'https://staging-admin.shesaconnect.com',
  // Production
  'https://admin.shesaconnect.com',
]);

const ALLOWED_HEADERS = [
  'authorization',
  'content-type',
  'x-trace-id',
  'x-idempotency-key',
  'apikey',
].join(', ');

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': ALLOWED_HEADERS,
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

/** Returns the preflight 204 response when method is OPTIONS, else null. */
export function handlePreflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

/** Wraps a Response with the CORS allow-origin header for the request. */
export function withCors(req: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(req.headers.get('origin')))) {
    headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
