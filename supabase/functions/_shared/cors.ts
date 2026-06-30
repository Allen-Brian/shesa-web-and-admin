/**
 * CORS handling for Edge Functions.
 *
 * Browser-side Server Actions are same-origin so CORS doesn't apply to
 * them. But Edge Functions are also callable from:
 *   - Cross-subdomain dev (auth.shesa.test → some Edge Function)
 *   - The `supabase functions serve` dev runner from `localhost:54321`
 *   - Direct curl/postman calls during debugging
 *
 * The allow-list mirrors the apex-domain pattern from
 * @shesa/config — every Shesa subdomain in staging/prod, plus the
 * local dev test hostnames.
 */

const ALLOWED_ORIGINS = new Set([
  // Local dev
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://web.shesa.test:3000',
  'http://auth.shesa.test:3001',
  'http://exco.shesa.test:3002',
  'http://finance.shesa.test:3003',
  'http://connect.shesa.test:3004',
  'http://127.0.0.1:54321',
  // Staging
  'https://web.staging.shesa.org',
  'https://auth.staging.shesa.org',
  'https://exco.staging.shesa.org',
  'https://finance.staging.shesa.org',
  'https://connect.staging.shesa.org',
  // Production
  'https://shesa.org',
  'https://www.shesa.org',
  'https://auth.shesa.org',
  'https://exco.shesa.org',
  'https://finance.shesa.org',
  'https://connect.shesa.org',
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
