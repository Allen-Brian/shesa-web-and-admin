/**
 * Action: expenses/approve
 *
 * POST /functions/v1/expenses/approve — Admin (President) approves an
 * expense that entered as 'pending_approval' (above the body's per-
 * scope threshold). Spec Part X.
 *
 * The transition pending_approval → approved fires the M7 UPDATE
 * trigger which writes the ledger + updates the treasury balance.
 * After approval, the M1 freeze trigger tightens fully — the row is
 * completely immutable.
 *
 * Auth: expense.approve at the expense's scope.
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
    id: z.string().uuid(),
  })
  .strict();

interface ExpenseRow {
  readonly id: string;
  readonly scope_id: string;
  readonly amount: string;
  readonly currency: string;
  readonly status: string;
  readonly payee: string;
}

export async function approveExpense(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  const { data: expenseRow, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('expenses' as never)
    .select('id, scope_id, amount, currency, status, payee')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'expenses/approve: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!expenseRow) return withCors(req, notFound('expense', ctx.traceId));
  const row = expenseRow as ExpenseRow;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'expense.approve',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('expense.approve', ctx.traceId, { scopeId: row.scope_id }));
  }

  if (row.status !== 'pending_approval') {
    return withCors(
      req,
      conflict(
        'NOT_PENDING',
        `Expense must be in status=pending_approval to approve (currently ${row.status}).`,
        ctx.traceId,
      ),
    );
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await serviceClient
    .schema('finance' as never)
    .from('expenses' as never)
    .update({
      status: 'approved',
      approved_by: ctx.userId,
      approved_at: now,
    } as never)
    .eq('id', row.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'expenses/approve: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'expense.approved',
    entitySchema: 'finance',
    entityTable: 'expenses',
    entityId: row.id,
    scopeId: row.scope_id,
    metadata: { payee: row.payee, amount: row.amount, currency: row.currency },
  });

  return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
}
