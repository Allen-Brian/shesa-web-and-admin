/**
 * Action: payments/reverse
 *
 * POST /functions/v1/payments/reverse — inserts a reversing payment.
 * Spec Part VII:
 *
 *   Immutability & corrections — neither amount nor payer can be
 *   edited after recording. Mistakes are fixed with reversing entries
 *   (a new payment that negates a prior one, reason logged), never
 *   edits.
 *
 * The reversal is a full payment row with:
 *   * reverses_payment_id → the original.
 *   * reversal_reason     → mandatory human-readable string.
 *   * amount              → SAME positive amount as the original (the
 *                           "negation" is expressed by reverses_payment_id,
 *                           not a signed amount — the payments.amount
 *                           CHECK is amount > 0).
 *   * source              → 'manual' (a human is causing this).
 *   * All other pointers (scope, obligation, charge, currency, method,
 *     payer) are copied from the original for consistency.
 *
 * A single original payment can be reversed at most once — a duplicate
 * attempt returns 409. Reversing a reversal itself is blocked with the
 * same 409 (double-reversal breaks the "chain of one" audit clarity).
 *
 * Auth: payment.reverse at the original payment's scope.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  conflict,
  forbidden,
  internalError,
  notFound,
  success,
  unauthorized,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    originalPaymentId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

interface PaymentRow {
  readonly id: string;
  readonly obligation_id: string | null;
  readonly charge_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: string; // NUMERIC → text over the wire
  readonly currency: string;
  readonly method: string;
  readonly reverses_payment_id: string | null;
}

export async function reversePayment(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  const { data: originalRow, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('payments' as never)
    .select(
      'id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, reverses_payment_id',
    )
    .eq('id', input.originalPaymentId)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/reverse: original load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!originalRow) return withCors(req, notFound('payment', ctx.traceId));
  const original = originalRow as PaymentRow;

  // Reject reversing a reversal — double-reversal breaks audit clarity.
  if (original.reverses_payment_id !== null) {
    return withCors(
      req,
      conflict(
        'IS_REVERSAL',
        'This payment is already a reversal — cannot reverse it further. Insert a fresh payment if a re-correction is needed.',
        ctx.traceId,
      ),
    );
  }

  // Reject a duplicate reversal.
  const { count: existingReversals, error: countErr } = await serviceClient
    .schema('finance' as never)
    .from('payments' as never)
    .select('id', { count: 'exact', head: true })
    .eq('reverses_payment_id', original.id);

  if (countErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/reverse: reversal count failed',
        error: countErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if ((existingReversals ?? 0) > 0) {
    return withCors(
      req,
      conflict('ALREADY_REVERSED', 'This payment has already been reversed.', ctx.traceId),
    );
  }

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'payment.reverse',
    scopeId: original.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('payment.reverse', ctx.traceId, { scopeId: original.scope_id }));
  }

  const { data: row, error: insertErr } = await serviceClient
    .schema('finance' as never)
    .from('payments' as never)
    .insert({
      obligation_id: original.obligation_id,
      charge_id: original.charge_id,
      scope_id: original.scope_id,
      payer_member_id: original.payer_member_id,
      amount: original.amount,
      currency: original.currency,
      method: original.method,
      source: 'manual',
      recorded_by: ctx.userId,
      reverses_payment_id: original.id,
      reversal_reason: input.reason,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr || !row) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/reverse: insert failed',
        code: insertErr?.code,
        error: insertErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const id = (row as { id: string }).id;

  await logEvent(serviceClient, ctx, {
    action: 'payment.reversed',
    entitySchema: 'finance',
    entityTable: 'payments',
    entityId: id,
    scopeId: original.scope_id,
    metadata: {
      originalPaymentId: original.id,
      amount: original.amount,
      currency: original.currency,
      reason: input.reason,
    },
  });

  return withCors(req, success({ id, traceId: ctx.traceId }, 201));
}
