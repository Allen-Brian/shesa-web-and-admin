/**
 * CORS handling for Edge Functions.
 *
 * Browser-side Server Actions are same-origin so CORS doesn't apply to
 * them. But Edge Functions are also callable from:
 *   - Cross-subdomain dev (auth.shesa.test → some Edge Function)
 *   - The `supabase functions serve` dev runner from `localhost:54321`
 *   - Direct curl/postman calls during debugging
 *
 * ─── KEEP IN SYNC WITH packages/config/src/cors-allowlist.ts ────────
 * That module is the canonical list; this file duplicates it because
 * Deno-run Edge Functions can't reliably import from `packages/*`.
 * If you change one, change both — a divergence surfaces as a
 * "works in the SPA, fails in the Edge Function" (or reverse) bug
 * that's hard to attribute.
 * ────────────────────────────────────────────────────────────────────
 */

const ALLOWED_ORIGINS = new Set<string>([
  // Local dev (per /etc/hosts alias + bare localhost fallbacks)
  'http://web.shesa.test:3000',
  'http://auth.shesa.test:3001',
  'http://exco.shesa.test:3002',
  'http://finance.shesa.test:3003',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:54321',
  // Staging (sibling hostnames sharing the shesaconnect.com apex)
  'https://staging.shesaconnect.com',
  'https://staging-auth.shesaconnect.com',
  'https://staging-exco.shesaconnect.com',
  'https://staging-finance.shesaconnect.com',
  // Production
  'https://shesaconnect.com',
  'https://www.shesaconnect.com',
  'https://auth.shesaconnect.com',
  'https://exco.shesaconnect.com',
  'https://finance.shesaconnect.com',
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
