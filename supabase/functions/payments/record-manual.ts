/**
 * Action: payments/record-manual
 *
 * POST /functions/v1/payments/record-manual — Finance records a manual
 * / cash / bank-transfer payment. Spec Part VII:
 *
 *   Manual / cash entry — the batch or branch collects physically;
 *   Finance records each payment manually. These are as real as
 *   windowed payments in the ledger, but flagged `source = manual`
 *   with a recorded-by actor.
 *
 * Exactly one of obligationId or chargeId must be provided:
 *   * obligationId → settling a dues obligation (charge shape). Scope
 *                    and currency derive from the obligation row.
 *   * chargeId     → contribution/donation/goal path (no obligation
 *                    exists). Scope and currency derive from the charge.
 *
 * Auth: payment.record at the resolved scope.
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
    payerMemberId: z.string().uuid().optional(),
    amount: z.number().positive(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),
    method: z.enum(PAYMENT_METHODS),
    memo: z.string().trim().max(500).optional(),
    externalRef: z.string().trim().max(200).optional(),
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
  readonly shape: string;
}

export async function recordManualPayment(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  // Resolve scope + currency from either the obligation or the charge.
  let scopeId: string;
  let currency: string;
  let chargeId: string | null = null;
  let derivedPayer: string | null = input.payerMemberId ?? null;

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
          message: 'payments/record-manual: obligation load failed',
          error: obErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    if (!obligationRow) return withCors(req, notFound('obligation', ctx.traceId));
    const obligation = obligationRow as ObligationRow;

    if (obligation.status === 'cancelled') {
      return withCors(
        req,
        conflict(
          'OBLIGATION_CANCELLED',
          'Cannot record a payment against a cancelled obligation.',
          ctx.traceId,
        ),
      );
    }

    scopeId = obligation.scope_id;
    currency = obligation.currency;
    chargeId = obligation.charge_id;
    if (!derivedPayer && obligation.party_type === 'member') {
      derivedPayer = obligation.party_id;
    }
  } else {
    // chargeId path (contribution / donation / goal).
    const { data: chargeRow, error: chErr } = await serviceClient
      .schema('finance' as never)
      .from('charges' as never)
      .select('id, scope_id, currency, shape')
      .eq('id', input.chargeId!)
      .maybeSingle();
    if (chErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'payments/record-manual: charge load failed',
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
    action: 'payment.record',
    scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('payment.record', ctx.traceId, { scopeId }));
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
      payer_member_id: derivedPayer,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      source: 'manual',
      recorded_by: ctx.userId,
      external_ref: input.externalRef ?? null,
      metadata: input.memo ? { memo: input.memo } : {},
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr || !row) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/record-manual: insert failed',
        code: insertErr?.code,
        error: insertErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const id = (row as { id: string }).id;

  await logEvent(serviceClient, ctx, {
    action: 'payment.recorded',
    entitySchema: 'finance',
    entityTable: 'payments',
    entityId: id,
    scopeId,
    metadata: {
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      obligationId: input.obligationId ?? null,
      chargeId,
    },
  });

  return withCors(req, success({ id, traceId: ctx.traceId }, 201));
}
