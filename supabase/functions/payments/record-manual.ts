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
  let settledObligation: ObligationRow | null = null;

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
    settledObligation = obligation;
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

  // Levy settlement mirror — when this payment settles an obligation a
  // body OWES (party_type='branch': a Global levy on a branch/chapter),
  // record the same amount as an EXPENSE in the paying body's treasury
  // so the outflow shows in its own books (spec Part IX/X: "a levy is
  // one expense settled from the branch"). The money itself is raised
  // outside the app — this is the bookkeeping mirror. Non-fatal: a
  // failure here never rolls back the payment, which is the primary
  // record. Skipped when the payer scope has no treasury (batches /
  // non-autonomous chapters) or its currency differs (cross-currency
  // conversion is deferred with the rest of the FX work).
  if (settledObligation && settledObligation.party_type === 'branch') {
    await mirrorLevyAsExpense(serviceClient, ctx, {
      payerScopeId: settledObligation.party_id,
      amount: input.amount,
      currency: input.currency,
      chargeId,
      obligationId: settledObligation.id,
      paymentId: id,
    });
  }

  return withCors(req, success({ id, traceId: ctx.traceId }, 201));
}

interface MirrorArgs {
  readonly payerScopeId: string;
  readonly amount: number;
  readonly currency: string;
  readonly chargeId: string | null;
  readonly obligationId: string;
  readonly paymentId: string;
}

/**
 * Best-effort mirror of a settled levy into the payer body's treasury
 * as a recorded expense. Guards on the payer having a treasury in the
 * matching currency; logs and returns quietly otherwise.
 */
async function mirrorLevyAsExpense(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  ctx: ReturnType<typeof buildContext>,
  args: MirrorArgs,
): Promise<void> {
  const { data: treasury } = await serviceClient
    .schema('finance' as never)
    .from('treasury_balances' as never)
    .select('scope_id, currency')
    .eq('scope_id', args.payerScopeId)
    .maybeSingle();
  const treasuryCurrency = (treasury as { currency: string } | null)?.currency;
  if (!treasury || treasuryCurrency !== args.currency) return;

  let payee = 'Levy settlement';
  if (args.chargeId) {
    const { data: charge } = await serviceClient
      .schema('finance' as never)
      .from('charges' as never)
      .select('name')
      .eq('id', args.chargeId)
      .maybeSingle();
    const name = (charge as { name: string } | null)?.name;
    if (name) payee = name;
  }

  const { error: expErr } = await serviceClient
    .schema('finance' as never)
    .from('expenses' as never)
    .insert({
      scope_id: args.payerScopeId,
      category_id: null,
      payee,
      amount: args.amount,
      currency: args.currency,
      // No metadata column on finance.expenses — the linkage lives in
      // the description + the audit event below.
      description: `Auto-recorded settlement of a levy owed upward (payment ${args.paymentId}).`,
      status: 'recorded',
      recorded_by: ctx.userId,
      incurred_at: new Date().toISOString(),
    } as never);

  if (expErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/record-manual: levy expense mirror failed (non-fatal)',
        code: expErr.code,
        error: expErr.message,
      }),
    );
    return;
  }

  await logEvent(serviceClient, ctx, {
    action: 'expense.recorded',
    entitySchema: 'finance',
    entityTable: 'expenses',
    entityId: null,
    scopeId: args.payerScopeId,
    metadata: {
      autoLevySettlement: true,
      amount: args.amount,
      currency: args.currency,
      obligationId: args.obligationId,
      sourcePaymentId: args.paymentId,
    },
  });
}
