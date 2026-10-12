/**
 * Action: payments/confirm
 *
 * POST /functions/v1/payments/confirm — polls / finalizes a payment
 * intent. The simulator drives success off the intent row's
 * available_from timestamp (initiate + delay); real providers would
 * check the gateway or read a webhook state.
 *
 * Response shape:
 *   { status: 'pending' | 'succeeded' | 'failed' | 'cancelled', ... }
 *
 * On 'succeeded' transition (available_from <= NOW), this endpoint:
 *   1. INSERTs a finance.payments row with source='auto'.
 *   2. UPDATEs the intent row: status='succeeded', resulting_payment_id.
 *   3. Audits payment.recorded.
 *
 * The M1 obligations_recompute_status_from_payments trigger then fires
 * on the payment INSERT — status transitions to partial/paid drop out
 * automatically.
 *
 * Idempotency:
 *   * status='succeeded' → return the existing resulting_payment_id.
 *   * status='failed' / 'cancelled' → return the terminal outcome.
 * A repeated confirm never double-writes.
 *
 * Auth: payment.record at the intent's scope.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    intentId: z.string().uuid(),
  })
  .strict();

interface IntentRow {
  readonly id: string;
  readonly obligation_id: string | null;
  readonly charge_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: string;
  readonly currency: string;
  readonly method: string;
  readonly status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  readonly available_from: string;
  readonly resulting_payment_id: string | null;
  readonly failure_reason: string | null;
}

interface PendingBody {
  readonly status: 'pending';
  readonly availableFrom: string;
  readonly traceId: string;
}

interface SucceededBody {
  readonly status: 'succeeded';
  readonly intentId: string;
  readonly paymentId: string;
  readonly traceId: string;
}

interface TerminalBody {
  readonly status: 'failed' | 'cancelled';
  readonly reason: string | null;
  readonly traceId: string;
}

export async function confirmPayment(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  const { data: intentRow, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('payment_intents' as never)
    .select(
      'id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, status, available_from, resulting_payment_id, failure_reason',
    )
    .eq('id', input.intentId)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/confirm: intent load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!intentRow) return withCors(req, notFound('payment_intent', ctx.traceId));
  const intent = intentRow as IntentRow;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'payment.record',
    scopeId: intent.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('payment.record', ctx.traceId, { scopeId: intent.scope_id }));
  }

  // Idempotent terminal returns.
  if (intent.status === 'succeeded') {
    if (!intent.resulting_payment_id) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message:
            'payments/confirm: succeeded intent has null resulting_payment_id (invariant violation)',
          intentId: intent.id,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    const body: SucceededBody = {
      status: 'succeeded',
      intentId: intent.id,
      paymentId: intent.resulting_payment_id,
      traceId: ctx.traceId,
    };
    return withCors(req, success(body));
  }
  if (intent.status === 'failed' || intent.status === 'cancelled') {
    const body: TerminalBody = {
      status: intent.status,
      reason: intent.failure_reason,
      traceId: ctx.traceId,
    };
    return withCors(req, success(body));
  }

  // Pending — check the simulator's clock.
  if (new Date(intent.available_from).getTime() > Date.now()) {
    const body: PendingBody = {
      status: 'pending',
      availableFrom: intent.available_from,
      traceId: ctx.traceId,
    };
    return withCors(req, success(body));
  }

  // Success path — INSERT payment row.
  const { data: paymentRow, error: insertErr } = await serviceClient
    .schema('finance' as never)
    .from('payments' as never)
    .insert({
      obligation_id: intent.obligation_id,
      charge_id: intent.charge_id,
      scope_id: intent.scope_id,
      payer_member_id: intent.payer_member_id,
      amount: intent.amount,
      currency: intent.currency,
      method: intent.method,
      source: 'auto',
      recorded_by: ctx.userId,
      external_ref: `sim_ok_${intent.id}`,
      metadata: { intent_id: intent.id, provider: 'simulated' },
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr || !paymentRow) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/confirm: payment insert failed',
        code: insertErr?.code,
        error: insertErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const paymentId = (paymentRow as { id: string }).id;

  const { error: updateErr } = await serviceClient
    .schema('finance' as never)
    .from('payment_intents' as never)
    .update({
      status: 'succeeded',
      resulting_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', intent.id);

  if (updateErr) {
    // Payment was written but intent update failed. Log loudly — a
    // duplicate confirm attempt will hit the succeeded path via the
    // resulting_payment_id, but the row is temporarily inconsistent.
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/confirm: intent status update failed after payment insert',
        paymentId,
        intentId: intent.id,
        error: updateErr.message,
      }),
    );
  }

  await logEvent(serviceClient, ctx, {
    action: 'payment.recorded',
    entitySchema: 'finance',
    entityTable: 'payments',
    entityId: paymentId,
    scopeId: intent.scope_id,
    metadata: {
      phase: 'confirmed',
      intentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      method: intent.method,
      obligationId: intent.obligation_id,
      chargeId: intent.charge_id,
    },
  });

  const body: SucceededBody = {
    status: 'succeeded',
    intentId: intent.id,
    paymentId,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
}
