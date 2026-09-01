/**
 * Action: fapshi/status
 *
 * GET  /functions/v1/fapshi/status?intentId=UUID
 * POST /functions/v1/fapshi/status  (body: { intentId })
 *
 * Public polling endpoint. The AGM 2026 pending page hits this every
 * few seconds after the payer returns from Fapshi, waiting for the
 * intent to move off `pending`.
 *
 * Order of operations per call:
 *   1. Read the intent row via the SECURITY DEFINER RPC.
 *   2. If the intent is still pending AND has a provider_ref (Fapshi
 *      knows about it), do a live GET /payment-status against Fapshi
 *      and apply finalize / mark_terminal on the spot. This means the
 *      pending page resolves within one poll even when webhook + cron
 *      reconcile are both disabled (the MVP sandbox case).
 *   3. Return the (possibly-updated) row shape.
 *
 * Intent IDs are UUIDs and never leak to a third party (only the
 * specific payer receives them in the URL), so no additional auth
 * beyond the URL guess space.
 *
 * verify_jwt=false is set on this function's parent group. The RPC is
 * SECURITY DEFINER + scoped to public-flow rows.
 */

import { withCors } from '../_shared/cors.ts';
import { FapshiError, getPaymentStatus } from '../_shared/fapshi.ts';
import { internalError, notFound, success, validationError } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StatusRow {
  readonly status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired';
  readonly receipt_token: string | null;
  readonly hosted_link: string | null;
  readonly failure_reason: string | null;
}

export async function fapshiStatus(req: Request): Promise<Response> {
  const ctx = buildContext(req);

  let intentId: string | null = null;
  if (req.method === 'GET') {
    const url = new URL(req.url);
    intentId = url.searchParams.get('intentId');
  } else if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { intentId?: string };
      intentId = body.intentId ?? null;
    } catch {
      return withCors(req, validationError('Invalid JSON body', ctx.traceId));
    }
  } else {
    return withCors(req, validationError('Method not allowed', ctx.traceId));
  }

  if (!intentId || !UUID_RE.test(intentId)) {
    return withCors(req, validationError('intentId must be a UUID', ctx.traceId));
  }

  const service = createServiceRoleClient();

  // Fast path: read the current row.
  let row: FullStatusRow | null;
  try {
    row = await readIntent(service, intentId);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'fapshi/status: readIntent failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!row) return withCors(req, notFound('intent', ctx.traceId));

  // Belt-and-braces path: if the intent is still pending and Fapshi
  // already gave us a transId, poll Fapshi live and apply the terminal
  // transition on the spot. This is what lets the pending page resolve
  // without needing a webhook or the reconcile cron — required for the
  // sandbox MVP. When the webhook / cron ARE configured, this is a
  // benign second call: finalize_fapshi_intent is idempotent, and
  // mark_fapshi_intent_terminal short-circuits on already-terminal.
  if (row.status === 'pending' && row.provider_ref) {
    try {
      const fresh = await getPaymentStatus(row.provider_ref);
      if (fresh.status === 'SUCCESSFUL') {
        await service.schema('finance' as never).rpc(
          'finalize_fapshi_intent' as never,
          {
            p_provider_ref: row.provider_ref,
            p_medium: fresh.medium ?? null,
            p_webhook_body: fresh as unknown as Record<string, unknown>,
          } as never,
        );
        row = (await readIntent(service, intentId)) ?? row;
      } else if (fresh.status === 'FAILED' || fresh.status === 'EXPIRED') {
        const mapped = fresh.status === 'FAILED' ? 'failed' : 'expired';
        await service.schema('finance' as never).rpc(
          'mark_fapshi_intent_terminal' as never,
          {
            p_provider_ref: row.provider_ref,
            p_status: mapped,
            p_reason: `status-poll:${fresh.status}`,
            p_webhook_body: fresh as unknown as Record<string, unknown>,
          } as never,
        );
        row = (await readIntent(service, intentId)) ?? row;
      }
      // CREATED / PENDING → leave the row as-is; caller polls again.
    } catch (err) {
      const isFapshi = err instanceof FapshiError;
      console.warn(
        JSON.stringify({
          level: 'warn',
          traceId: ctx.traceId,
          message: 'fapshi/status: live poll failed (returning cached row)',
          providerRef: row.provider_ref,
          fapshiStatus: isFapshi ? err.status : undefined,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      // Fall through with cached row — caller can retry.
    }
  }

  return withCors(
    req,
    success({
      status: row.status,
      receiptToken: row.receipt_token,
      hostedLink: row.hosted_link,
      failureReason: row.failure_reason,
      traceId: ctx.traceId,
    }),
  );
}

interface FullStatusRow extends StatusRow {
  readonly provider_ref: string | null;
}

async function readIntent(
  service: ReturnType<typeof createServiceRoleClient>,
  intentId: string,
): Promise<FullStatusRow | null> {
  const { data, error } = await service
    .schema('finance' as never)
    .rpc('get_public_intent_status' as never, { p_intent_id: intentId } as never);
  if (error) {
    throw new Error(`get_public_intent_status: ${error.message}`);
  }
  const rows = data as StatusRow[] | null;
  const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!first) return null;

  // The RPC currently returns only the four public columns; we need
  // provider_ref to do the live poll. Second read from the table
  // directly (still service role, still safe).
  const { data: refRow } = await service
    .schema('finance' as never)
    .from('payment_intents' as never)
    .select('provider_ref')
    .eq('id', intentId)
    .maybeSingle();
  const providerRef = (refRow as { provider_ref: string | null } | null)?.provider_ref ?? null;

  return { ...first, provider_ref: providerRef };
}
