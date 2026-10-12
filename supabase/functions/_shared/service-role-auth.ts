/**
 * "Was this called by our own server, or by a browser?"
 *
 * Some endpoints are reachable only from `apps/web`'s server side — the
 * public checkout initiator, for one, because the visitor's rate limit is
 * applied there and an endpoint the anon key could reach would make that
 * limit one `curl` away from irrelevant.
 *
 * ─── Why not compare against SUPABASE_SERVICE_ROLE_KEY ─────────────────
 * That was the first version, and it broke the moment it met production:
 * the key in the deployment's environment and the key the Edge runtime
 * holds were different values, so every call 401'd. They can differ for
 * several ordinary reasons — a rotation applied in one place first, or
 * Supabase's newer `sb_secret_…` keys sitting alongside the legacy JWT
 * ones — and a check that fails on any of them is a check that will fail
 * again.
 *
 * ─── What is checked instead ───────────────────────────────────────────
 * The `role` claim on the caller's own token. These functions run with
 * `verify_jwt = true`, so Supabase's gateway has already verified the
 * signature before this code sees the request; the claim inside is
 * therefore authentic and cannot be forged.
 *
 * Signature verification alone would prove nothing here — the anon key
 * that ships in every browser bundle is also a validly signed project
 * JWT. That is exactly what makes `verify_jwt` a signature check and not
 * an authorization check, and why the claim has to be read.
 *
 * Non-JWT keys fall back to a constant-time comparison against the
 * configured service key, so both key formats work.
 */

import { secretsMatch } from './worker-auth.ts';

/** Decode a JWT payload without verifying — the gateway already did. */
function claims(jwt: string): Record<string, unknown> | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * True when the caller presented a service-role credential.
 *
 * Deliberately says nothing about *which* server called: any holder of a
 * service-role key is inside the trust boundary already, since that key
 * bypasses RLS entirely.
 */
export async function isServiceRole(jwt: string | null): Promise<boolean> {
  if (!jwt) return false;

  const payload = claims(jwt);
  if (payload && payload.role === 'service_role') return true;

  // Newer `sb_secret_…` keys are opaque, not JWTs, so there is no claim to
  // read and the value itself is the only thing to check.
  const configured = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (configured && (await secretsMatch(jwt, configured))) return true;

  return false;
}
