/**
 * Shared-secret gate for Edge Functions that run as service_role with no
 * user in the request — queue consumers, sweeps, scheduled jobs.
 *
 * ─── Why a secret and not verify_jwt ────────────────────────────────
 * `verify_jwt` is a SIGNATURE check, not an authorization check. It
 * accepts any JWT signed with the project secret, and the anon key is
 * exactly that — a valid project JWT that ships in every browser bundle
 * by design. So a function protected only by `verify_jwt` is, in
 * practice, callable by anyone on the internet.
 *
 * That is fine for handlers that immediately do their own
 * `authorize(...)` check against the caller's identity. It is NOT fine
 * for a handler that opens a service-role client and starts draining a
 * queue, because there is no caller identity to check. Those need a
 * secret only the scheduler knows.
 *
 * ─── Constant-time comparison ───────────────────────────────────────
 * The obvious `if (a.length !== b.length) return false` guard leaks the
 * secret's length through response timing. Hashing both sides to a
 * fixed 32 bytes first removes that: every comparison is over the same
 * number of bytes regardless of what was supplied.
 */

/** SHA-256 a string to a fixed-width byte array. */
async function digest(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(hash);
}

/**
 * Compare two secrets without leaking length or content through timing.
 * Both sides are hashed first, so the loop always runs over 32 bytes.
 */
export async function secretsMatch(provided: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(provided), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export interface WorkerAuthFailure {
  readonly ok: false;
  /** Why it failed — for the server log only, never the response body. */
  readonly reason: 'not_configured' | 'missing_header' | 'mismatch';
}
export type WorkerAuthResult = { readonly ok: true } | WorkerAuthFailure;

/**
 * Check the `x-worker-secret` header against an environment variable.
 *
 * Fails closed when the variable is unset: an unconfigured deployment
 * must reject every call rather than silently accept them all. That is
 * the opposite of the usual "skip when unconfigured" convenience, and
 * deliberately so — this gate is the only thing in front of a
 * service-role client.
 */
export async function checkWorkerSecret(
  req: Request,
  envVar: string,
  headerName = 'x-worker-secret',
): Promise<WorkerAuthResult> {
  const expected = Deno.env.get(envVar);
  if (!expected) return { ok: false, reason: 'not_configured' };

  const provided = req.headers.get(headerName);
  if (!provided) return { ok: false, reason: 'missing_header' };

  return (await secretsMatch(provided, expected))
    ? { ok: true }
    : { ok: false, reason: 'mismatch' };
}
