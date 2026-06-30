/**
 * Per-request context that every Edge Function builds first:
 *   - traceId   — for end-to-end tracing (forwarded from the Server Action,
 *                 or generated here if absent — e.g. webhook callers).
 *   - jwt       — the caller's Supabase Auth access token, extracted
 *                 from the Authorization header. Null for unauthenticated
 *                 contexts (webhooks, cron — those use service_role).
 *   - userId    — auth.uid() of the caller, parsed from the JWT payload.
 *                 Null when jwt is null.
 *   - idempotencyKey — forwarded from the Server Action for mutating
 *                      calls (ADR-0015). Null for read-only calls.
 *   - ip / ua   — captured for audit metadata (best-effort; depends on
 *                 the reverse-proxy headers we get).
 */

export interface RequestContext {
  readonly traceId: string;
  readonly jwt: string | null;
  readonly userId: string | null;
  readonly idempotencyKey: string | null;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Generate a UUID v4. Uses Web Crypto, no dep. */
function generateTraceId(): string {
  return crypto.randomUUID();
}

/**
 * Pull the JWT's `sub` claim (the user id). We do NOT verify the
 * signature here — Supabase's runtime has already verified the JWT
 * before the function gets the request (when the Authorization header
 * is set and the function's `verify_jwt` config is the default true).
 *
 * For functions where verify_jwt is explicitly disabled (webhooks),
 * the caller wouldn't have a Supabase-issued JWT anyway; this returns
 * null in that case.
 */
function parseUserIdFromJwt(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json);
    const sub = claims?.sub;
    return typeof sub === 'string' && UUID_RE.test(sub) ? sub : null;
  } catch {
    return null;
  }
}

export function buildContext(req: Request): RequestContext {
  const auth = req.headers.get('authorization');
  const jwt = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  const userId = jwt ? parseUserIdFromJwt(jwt) : null;

  const traceId = req.headers.get('x-trace-id') ?? generateTraceId();
  const idempotencyKey = req.headers.get('x-idempotency-key');

  // Reverse-proxy header conventions: Cloudflare sets cf-connecting-ip,
  // generic proxies set x-forwarded-for. Fall back to remote.
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;

  const userAgent = req.headers.get('user-agent');

  return { traceId, jwt, userId, idempotencyKey, ip, userAgent };
}
