/**
 * Edge Function fetch wrapper.
 *
 * Reads the access token from the session store, sends the standard
 * `Authorization: Bearer <token>` + `apikey` headers to Supabase, and
 * unwraps the standard ADR-0009 error envelope so consumers see one
 * shape regardless of where the error originated.
 *
 * Kept small on purpose — TanStack Query owns retries, cache, and
 * background refetch. This function is *just* the transport.
 */

import { clientEnv } from '@shesa/config/env.client';

import { useSessionStore } from './session-store';

interface ErrorEnvelope {
  status: number;
  code: string;
  message: string;
  traceId?: string;
  fields?: Record<string, string>;
  body?: unknown;
}

export class EdgeFunctionError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId?: string;
  readonly fields?: Record<string, string>;
  readonly body?: unknown;

  constructor(envelope: ErrorEnvelope) {
    super(envelope.message);
    this.name = 'EdgeFunctionError';
    this.status = envelope.status;
    this.code = envelope.code;
    this.traceId = envelope.traceId;
    this.fields = envelope.fields;
    this.body = envelope.body;
  }
}

/**
 * POST to a Supabase Edge Function with the caller's session.
 *
 * Throws EdgeFunctionError on non-2xx responses so `useMutation`
 * onError handlers can pattern-match on `.code` (e.g. `CAP_EXCEEDED`,
 * `DUPLICATE_MEMBER`) for surface-specific feedback.
 */
export async function invokeEdgeFunction<TResp = unknown>(
  functionName: string,
  body: unknown,
): Promise<TResp> {
  const accessToken = useSessionStore.getState().accessToken;
  if (!accessToken) {
    throw new EdgeFunctionError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'No active session; sign in again',
    });
  }

  const res = await fetch(`${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      apikey: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text };
  }

  if (!res.ok) {
    const envelope = (parsed ?? {}) as Partial<ErrorEnvelope>;
    throw new EdgeFunctionError({
      status: envelope.status ?? res.status,
      code: envelope.code ?? 'UNKNOWN',
      message: envelope.message ?? `Edge function ${functionName} failed (${res.status})`,
      traceId: envelope.traceId,
      fields: envelope.fields,
      body: envelope.body,
    });
  }

  return parsed as TResp;
}
