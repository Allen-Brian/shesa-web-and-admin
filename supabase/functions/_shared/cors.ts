/**
 * CORS handling for Edge Functions — collapsed to admin's origin per
 * environment after the Phase 2 pivot (ADR-0040 supersedes ADR-0035).
 *
 * Server Actions on `apps/admin` are same-origin with Supabase, so no
 * browser-side call from admin crosses an origin. `apps/web` is public
 * (no authenticated calls). This list exists for the rare case of a
 * client component calling an Edge Function directly.
 *
 * ─── Why the environment branch is here and not in packages/config ──
 * There used to be a second copy of this list in
 * `packages/config/src/cors-allowlist.ts`, described in both files as the
 * canonical one and kept in sync by hand. It had no importers — it was
 * dead code — and the copy that actually ran, this one, was the copy
 * that was NOT environment-branched. So `http://localhost:3002`,
 * `http://admin.shesa.test:3002` and `http://127.0.0.1:54321` were
 * accepted origins in production: any page on a developer's machine, or
 * anything that could bind those names, could make a credentialed
 * cross-origin call to an Edge Function.
 *
 * The dead module is gone and the branch lives here, in the file that
 * runs. `SUPABASE_URL` is injected by the Edge runtime and is the only
 * signal available without provisioning a new secret; it points at a
 * loopback or in-cluster host locally and at `<ref>.supabase.co` when
 * hosted. It fails closed — anything that is not recognisably local is
 * treated as production.
 * ────────────────────────────────────────────────────────────────────
 */

const LOCAL_ORIGINS = [
  'http://admin.shesa.test:3002',
  'http://localhost:3002',
  // Supabase Functions dev runner.
  'http://127.0.0.1:54321',
];

const HOSTED_ORIGINS = ['https://staging-admin.shesaconnect.com', 'https://admin.shesaconnect.com'];

/** True only when the Edge runtime is pointed at a local Supabase stack. */
function isLocalRuntime(): boolean {
  const raw = Deno.env.get('SUPABASE_URL');
  if (!raw) return false; // no signal → assume production
  try {
    const host = new URL(raw).hostname;
    return (
      host === '127.0.0.1' ||
      host === 'localhost' ||
      host === 'kong' ||
      host === 'host.docker.internal'
    );
  } catch {
    return false;
  }
}

const ALLOWED_ORIGINS = new Set<string>(
  isLocalRuntime() ? [...LOCAL_ORIGINS, ...HOSTED_ORIGINS] : HOSTED_ORIGINS,
);

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
