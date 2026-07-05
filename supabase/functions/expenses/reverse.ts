/**
 * Action: expenses/reverse
 *
 * POST /functions/v1/expenses/reverse — inserts a reversing expense
 * row. Spec Part X:
 *
 *   an expense, once recorded, is corrected by a reversing entry,
 *   never edited.
 *
 * The reversal is a full expense row with:
 *   * reverses_expense_id → the original.
 *   * reversal_reason     → mandatory human-readable string.
 *   * amount              → SAME positive amount as the original.
 *   * status              → 'recorded' (skips approval; fires the M7
 *                           ledger writer immediately with direction=
 *                           'income' to cancel out).
 *
 * A single original can be reversed at most once. Reversing a reversal
 * is blocked (single-chain audit).
 *
 * Auth: expense.reverse at the original expense's scope.
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
    originalExpenseId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

interface ExpenseRow {
  readonly id: string;
  readonly scope_id: string;
  readonly category_id: string | null;
  readonly payee: string;
  readonly amount: string;
  readonly currency: string;
  readonly description: string | null;
  readonly status: string;
  readonly reverses_expense_id: string | null;
}

export async function reverseExpense(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  const { data: originalRow, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('expenses' as never)
    .select(
      'id, scope_id, category_id, payee, amount, currency, description, status, reverses_expense_id',
    )
    .eq('id', input.originalExpenseId)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'expenses/reverse: original load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!originalRow) return withCors(req, notFound('expense', ctx.traceId));
  const original = originalRow as ExpenseRow;

  if (original.reverses_expense_id !== null) {
    return withCors(
      req,
      conflict(
        'IS_REVERSAL',
        'This expense is already a reversal — cannot reverse it further.',
        ctx.traceId,
      ),
    );
  }

  if (original.status === 'pending_approval') {
    return withCors(
      req,
      conflict(
        'NOT_LEDGERED',
        'Original expense is pending approval and has not hit the ledger. Reject it via a follow-up instead of reversing.',
        ctx.traceId,
      ),
    );
  }

  const { count: existingReversals, error: countErr } = await serviceClient
    .schema('finance' as never)
    .from('expenses' as never)
    .select('id', { count: 'exact', head: true })
    .eq('reverses_expense_id', original.id);

  if (countErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'expenses/reverse: reversal count failed',
        error: countErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if ((existingReversals ?? 0) > 0) {
    return withCors(
      req,
      conflict('ALREADY_REVERSED', 'This expense has already been reversed.', ctx.traceId),
    );
  }

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'expense.reverse',
    scopeId: original.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('expense.reverse', ctx.traceId, { scopeId: original.scope_id }));
  }

  const { data: row, error: insertErr } = await serviceClient
    .schema('finance' as never)
    .from('expenses' as never)
    .insert({
      scope_id: original.scope_id,
      category_id: original.category_id,
      payee: original.payee,
      amount: original.amount,
      currency: original.currency,
      description: original.description,
      status: 'recorded',
      recorded_by: ctx.userId,
      reverses_expense_id: original.id,
      reversal_reason: input.reason,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr || !row) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'expenses/reverse: insert failed',
        code: insertErr?.code,
        error: insertErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const id = (row as { id: string }).id;

  await logEvent(serviceClient, ctx, {
    action: 'expense.reversed',
    entitySchema: 'finance',
    entityTable: 'expenses',
    entityId: id,
    scopeId: original.scope_id,
    metadata: {
      originalExpenseId: original.id,
      amount: original.amount,
      currency: original.currency,
      reason: input.reason,
    },
  });

  return withCors(req, success({ id, traceId: ctx.traceId }, 201));
}
