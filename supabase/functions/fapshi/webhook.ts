/**
 * Action: fapshi/webhook
 *
 * POST /functions/v1/fapshi/webhook — receives Fapshi's server-to-server
 * notifications. Fapshi sends this ONCE per terminal transition
 * (SUCCESSFUL / FAILED / EXPIRED) and does NOT retry, so:
 *
 *   1. Return 200 quickly so Fapshi doesn't consider us down and give up
 *      on the (already-lost) retry path.
 *   2. The reconcile cron catches anything the webhook missed — do not
 *      rely on the webhook alone.
 *
 * Authentication: Fapshi doesn't use HMAC. Every request includes an
 * `x-wh-secret` header with the value we configured on the Fapshi
 * dashboard for this service. We compare it to FAPSHI_WEBHOOK_SECRET
 * with a length-safe equality; a mismatch returns 401 without exposing
 * whether the secret was present or malformed.
 *
 * Body shape (Fapshi's docs, current as of 2026-07):
 *   { transId, status, medium, amount, revenue, payerName, email,
 *     externalId, userId, dateInitiated, dateConfirmed }
 *
 * We route to:
 *   * finance.finalize_fapshi_intent(transId, medium, body) on SUCCESSFUL
 *   * finance.mark_fapshi_intent_terminal(transId, status, reason, body)
 *     on FAILED / EXPIRED (both are idempotent + silent on unknown ref)
 *
 * verify_jwt=false is set on this function (config.toml). Auth is the
 * webhook secret, not a JWT.
 */

import { withCors } from '../_shared/cors.ts';
import { success, unauthorized, validationError } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';

interface FapshiWebhookBody {
  readonly transId?: string;
  readonly status?: 'CREATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';
  readonly medium?: string;
  readonly amount?: number;
  readonly revenue?: number;
  readonly payerName?: string;
  readonly email?: string;
  readonly externalId?: string;
  readonly userId?: string;
  readonly dateInitiated?: string;
  readonly dateConfirmed?: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function fapshiWebhook(req: Request): Promise<Response> {
  const ctx = buildContext(req);

  if (req.method !== 'POST') {
    return withCors(req, validationError('POST required', ctx.traceId));
  }

  const expected = Deno.env.get('FAPSHI_WEBHOOK_SECRET');
  const provided = req.headers.get('x-wh-secret');
  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    // Log the near-miss without leaking anything about the secret.
    console.warn(
      JSON.stringify({
        level: 'warn',
        traceId: ctx.traceId,
        message: 'fapshi/webhook: rejected — missing or mismatched x-wh-secret',
        hasHeader: !!provided,
      }),
    );
    return withCors(req, unauthorized(ctx.traceId));
  }

  let body: FapshiWebhookBody;
  try {
    body = (await req.json()) as FapshiWebhookBody;
  } catch (err) {
    return withCors(
      req,
      validationError('Invalid JSON body', ctx.traceId, {
        _: err instanceof Error ? err.message : 'parse error',
      }),
    );
  }

  const transId = body.transId?.trim();
  const status = body.status;
  if (!transId || !status) {
    return withCors(req, validationError('Webhook body missing transId or status', ctx.traceId));
  }

  const service = createServiceRoleClient();

  try {
    if (status === 'SUCCESSFUL') {
      const { error } = await service.schema('finance' as never).rpc(
        'finalize_fapshi_intent' as never,
        {
          p_provider_ref: transId,
          p_medium: body.medium ?? null,
          p_webhook_body: body as unknown as Record<string, unknown>,
        } as never,
      );
      if (error) {
        // Two known-benign cases: intent not found (Fapshi called us
        // for a ref we never issued), and already-succeeded (short-
        // circuit inside the RPC). Both surface as ok; genuine bugs
        // surface as 500 and are re-hit by reconcile.
        console.error(
          JSON.stringify({
            level: 'error',
            traceId: ctx.traceId,
            message: 'fapshi/webhook: finalize failed',
            transId,
            code: error.code,
            error: error.message,
          }),
        );
        // Return 200 anyway — Fapshi won't retry, and reconcile will
        // pick up the intent if it's still pending on our side.
      }
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      const mapped = status === 'FAILED' ? 'failed' : 'expired';
      const { error } = await service.schema('finance' as never).rpc(
        'mark_fapshi_intent_terminal' as never,
        {
          p_provider_ref: transId,
          p_status: mapped,
          p_reason: status,
          p_webhook_body: body as unknown as Record<string, unknown>,
        } as never,
      );
      if (error) {
        console.error(
          JSON.stringify({
            level: 'error',
            traceId: ctx.traceId,
            message: 'fapshi/webhook: mark_terminal failed',
            transId,
            status: mapped,
            code: error.code,
            error: error.message,
          }),
        );
      }
    } else {
      // CREATED / PENDING — not a terminal event, no state change.
      console.info(
        JSON.stringify({
          level: 'info',
          traceId: ctx.traceId,
          message: 'fapshi/webhook: non-terminal status, ignoring',
          transId,
          status,
        }),
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'fapshi/webhook: uncaught error',
        transId,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    // Still return 200 — we never want Fapshi to think we're down and
    // give up on a webhook it won't retry anyway. Reconcile will heal.
  }

  return withCors(req, success({ ok: true, traceId: ctx.traceId }));
}
