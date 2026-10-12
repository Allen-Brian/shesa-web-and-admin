'use server';

/**
 * Server Actions for the shared AudienceSelector.
 *
 * The client component can't hit the audience/count Edge Function
 * directly because the session lives in an httpOnly cookie (per
 * ADR-0014 + ADR-0040) — @supabase/ssr's browser client has no way
 * to read it and would default to the anon key, yielding UNAUTHORIZED
 * on every preview request.
 *
 * Instead, the client calls this Server Action; the server client
 * reads the cookie, `supabase.functions.invoke` forwards the caller's
 * JWT, and the Edge Function authorizes normally.
 */

import { getServerClient } from '@/lib/supabase-server';
import { extractInvokeMessage } from '@/lib/edge-invoke';

export interface AudienceCountResult {
  readonly ok: boolean;
  readonly count?: number;
  readonly message?: string;
}

/**
 * Live count preview for the AudienceSelector.
 *
 * We accept `audience` as `unknown` (opaque JSON) — the Edge Function
 * validates its shape via the shared Zod schema. Serializing an
 * `AudienceDefinition` from the client into FormData would only add
 * ceremony without buying safety.
 */
export async function getAudienceCount(
  scopeId: string,
  audience: unknown,
): Promise<AudienceCountResult> {
  if (!scopeId) return { ok: false, message: 'No scope selected' };

  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('audience/count', {
    body: { scopeId, audience },
  });

  if (error) {
    const message = await extractInvokeMessage(error, 'Preview unavailable');
    return { ok: false, message };
  }

  const count =
    typeof (data as { count?: number })?.count === 'number' ? (data as { count: number }).count : 0;
  return { ok: true, count };
}
