/**
 * Action: payments/pay-on-behalf
 *
 * POST /functions/v1/payments/pay-on-behalf — Finance or the body's
 * Admin records a payment on behalf of a member. Spec Part VII:
 *
 *   Finance or the body's Admin can record a payment for a member
 *   (someone paid cash to the president). The obligation and payment
 *   still attach to that member. A member cannot pay on behalf of
 *   another through the admin surface.
 *
 * The payment row's payer_member_id is the BENEFICIARY (the member the
 * payment is FOR). recorded_by captures the actor who typed it in.
 * A note (typically the real payer's name / method) is stored in
 * metadata for the receipt + report views.
 *
 * Auth: payment.record_on_behalf at the resolved scope.
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
  validationError,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const PAYMENT_METHODS = ['mtn_momo', 'orange_money', 'cash', 'bank_transfer', 'card'] as const;

const inputSchema = z
  .object({
    obligationId: z.string().uuid().optional(),
    chargeId: z.string().uuid().optional(),
    beneficiaryMemberId: z.string().uuid(),
    amount: z.number().positive(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),
    method: z.enum(PAYMENT_METHODS),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((v) => !!v.obligationId || !!v.chargeId, {
    message: 'One of obligationId or chargeId must be provided.',
    path: ['obligationId'],
  });

interface ObligationRow {
  readonly id: string;
  readonly charge_id: string;
  readonly scope_id: string;
  readonly currency: string;
  readonly party_type: string;
  readonly party_id: string;
  readonly status: string;
}

interface ChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly currency: string;
}

export async function payOnBehalf(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  let scopeId: string;
  let currency: string;
  let chargeId: string | null = null;

  if (input.obligationId) {
    const { data: obligationRow, error: obErr } = await serviceClient
      .schema('finance' as never)
      .from('obligations' as never)
      .select('id, charge_id, scope_id, currency, party_type, party_id, status')
      .eq('id', input.obligationId)
      .maybeSingle();
    if (obErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'payments/pay-on-behalf: obligation load failed',
          error: obErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    if (!obligationRow) return withCors(req, notFound('obligation', ctx.traceId));
    const obligation = obligationRow as ObligationRow;

    // Spec constraint: a member cannot pay on behalf of another through
    // this endpoint (Finance/Admin only). The check upstream is the
    // permission gate; the DATA constraint is that the beneficiary is
    // the member the obligation actually names.
    if (obligation.party_type === 'member' && obligation.party_id !== input.beneficiaryMemberId) {
      return withCors(
        req,
        conflict(
          'BENEFICIARY_MISMATCH',
          'Beneficiary must match the member the obligation names.',
          ctx.traceId,
        ),
      );
    }

    if (obligation.status === 'cancelled') {
      return withCors(
        req,
        conflict('OBLIGATION_CANCELLED', 'Cannot pay against a cancelled obligation.', ctx.traceId),
      );
    }

    scopeId = obligation.scope_id;
    currency = obligation.currency;
    chargeId = obligation.charge_id;
  } else {
    const { data: chargeRow, error: chErr } = await serviceClient
      .schema('finance' as never)
      .from('charges' as never)
      .select('id, scope_id, currency')
      .eq('id', input.chargeId!)
      .maybeSingle();
    if (chErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'payments/pay-on-behalf: charge load failed',
          error: chErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    if (!chargeRow) return withCors(req, notFound('charge', ctx.traceId));
    const charge = chargeRow as ChargeRow;

    scopeId = charge.scope_id;
    currency = charge.currency;
    chargeId = charge.id;
  }

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'payment.record_on_behalf',
    scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('payment.record_on_behalf', ctx.traceId, { scopeId }));
  }

  if (currency !== input.currency) {
    return withCors(
      req,
      validationError(
        `Payment currency ${input.currency} does not match target currency ${currency}.`,
        ctx.traceId,
        { paymentCurrency: input.currency, targetCurrency: currency },
      ),
    );
  }

  const { data: row, error: insertErr } = await serviceClient
    .schema('finance' as never)
    .from('payments' as never)
    .insert({
      obligation_id: input.obligationId ?? null,
      charge_id: chargeId,
      scope_id: scopeId,
      payer_member_id: input.beneficiaryMemberId,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      source: 'manual',
      recorded_by: ctx.userId,
      metadata: {
        on_behalf: true,
        note: input.note ?? null,
      },
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr || !row) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/pay-on-behalf: insert failed',
        code: insertErr?.code,
        error: insertErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const id = (row as { id: string }).id;

  await logEvent(serviceClient, ctx, {
    action: 'payment.recorded_on_behalf',
    entitySchema: 'finance',
    entityTable: 'payments',
    entityId: id,
    scopeId,
    metadata: {
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      beneficiaryMemberId: input.beneficiaryMemberId,
      obligationId: input.obligationId ?? null,
      chargeId,
      note: input.note ?? null,
    },
  });

  return withCors(req, success({ id, traceId: ctx.traceId }, 201));
}
