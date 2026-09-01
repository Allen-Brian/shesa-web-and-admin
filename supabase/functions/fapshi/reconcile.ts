/**
 * Action: fapshi/reconcile
 *
 * POST /functions/v1/fapshi/reconcile
 *
 * Sweep pending Fapshi intents older than N seconds, poll Fapshi's
 * GET /payment-status/{transId}, and drive the intent to a terminal
 * state via the same finalize / mark_terminal RPCs the webhook uses.
 *
 * Why this exists: Fapshi's webhook fires ONCE and is never retried
 * (their docs are explicit). If our server hiccups, misroutes, or the
 * webhook is dropped at the network layer, we'd forever hold a
 * pending intent for a payment the payer already made. This sweep is
 * the belt to the webhook's braces — not optional.
 *
 * Auth: this action DOES verify JWT (part of the fapshi/ group with
 * verify_jwt=false, but we manually gate on a shared secret so only
 * pg_cron / a trusted admin can trigger it). Set
 * FAPSHI_RECONCILE_SECRET; caller must send it in
 * `x-reconcile-secret`. This lets us call from `net.http_post` in a
 * cron migration without needing to embed the service-role key.
 */

import { withCors } from '../_shared/cors.ts';
import { internalError, success, unauthorized } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { FapshiError, getPaymentStatus } from '../_shared/fapshi.ts';

interface PendingRow {
  readonly intent_id: string;
  readonly provider_ref: string;
}

interface SweepResult {
  readonly scanned: number;
  readonly finalized: number;
  readonly failed: number;
  readonly expired: number;
  readonly stillPending: number;
  readonly errors: number;
  readonly traceId: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function fapshiReconcile(req: Request): Promise<Response> {
  const ctx = buildContext(req);

  const expected = Deno.env.get('FAPSHI_RECONCILE_SECRET');
  const provided = req.headers.get('x-reconcile-secret');
  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    return withCors(req, unauthorized(ctx.traceId));
  }

  const service = createServiceRoleClient();

  const { data, error } = await service.schema('finance' as never).rpc(
    'list_pending_fapshi_intents_for_reconcile' as never,
    {
      p_older_than_seconds: 120,
      p_limit: 100,
    } as never,
  );

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'fapshi/reconcile: list failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const rows = (data as PendingRow[] | null) ?? [];
  const summary = {
    scanned: rows.length,
    finalized: 0,
    failed: 0,
    expired: 0,
    stillPending: 0,
    errors: 0,
  };

  for (const row of rows) {
    try {
      const status = await getPaymentStatus(row.provider_ref);

      if (status.status === 'SUCCESSFUL') {
        const { error: rpcErr } = await service.schema('finance' as never).rpc(
          'finalize_fapshi_intent' as never,
          {
            p_provider_ref: row.provider_ref,
            p_medium: status.medium ?? null,
            p_webhook_body: status as unknown as Record<string, unknown>,
          } as never,
        );
        if (rpcErr) {
          summary.errors++;
          console.error(
            JSON.stringify({
              level: 'error',
              traceId: ctx.traceId,
              message: 'fapshi/reconcile: finalize failed',
              intentId: row.intent_id,
              transId: row.provider_ref,
              code: rpcErr.code,
              error: rpcErr.message,
            }),
          );
        } else {
          summary.finalized++;
        }
      } else if (status.status === 'FAILED' || status.status === 'EXPIRED') {
        const mapped = status.status === 'FAILED' ? 'failed' : 'expired';
        const { error: rpcErr } = await service.schema('finance' as never).rpc(
          'mark_fapshi_intent_terminal' as never,
          {
            p_provider_ref: row.provider_ref,
            p_status: mapped,
            p_reason: `reconcile:${status.status}`,
            p_webhook_body: status as unknown as Record<string, unknown>,
          } as never,
        );
        if (rpcErr) {
          summary.errors++;
        } else {
          if (mapped === 'failed') summary.failed++;
          else summary.expired++;
        }
      } else {
        summary.stillPending++;
      }
    } catch (err) {
      summary.errors++;
      const isFapshi = err instanceof FapshiError;
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'fapshi/reconcile: poll failed',
          intentId: row.intent_id,
          transId: row.provider_ref,
          fapshiStatus: isFapshi ? err.status : undefined,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  const body: SweepResult = { ...summary, traceId: ctx.traceId };
  return withCors(req, success(body));
}
