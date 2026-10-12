/**
 * Action: expenses/record
 *
 * POST /functions/v1/expenses/record — Finance records an expense
 * against a treasury. Spec Part X.
 *
 * Threshold gate:
 *   * Read the scope's finance.expense_settings row.
 *   * approval_threshold_amount IS NULL OR expense.amount < threshold
 *     → status='recorded' → hits the ledger immediately via the M7
 *     INSERT trigger.
 *   * expense.amount >= threshold → status='pending_approval' → the
 *     Admin approves via expenses/approve to write the ledger.
 *
 * Auth: expense.record at the scope.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
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

const inputSchema = z
  .object({
    scopeId: z.string().uuid(),
    categoryId: z.string().uuid().nullable().optional(),
    payee: z.string().trim().min(1).max(200),
    amount: z.number().positive(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),
    description: z.string().trim().max(2000).nullable().optional(),
    attachmentUrl: z.string().trim().max(500).nullable().optional(),
    incurredAt: z.string().datetime().optional(),
  })
  .strict();

interface ScopeRow {
  readonly id: string;
  readonly scope_type: 'mainstream' | 'branch' | 'chapter' | 'batch' | 'house' | 'network';
  readonly chapter_kind: 'autonomous' | 'grouping' | null;
  readonly currency_code: string;
}

interface SettingsRow {
  readonly approval_threshold_amount: string | null;
  readonly approval_threshold_currency: string | null;
}

interface SuccessBody {
  readonly id: string;
  readonly status: 'recorded' | 'pending_approval';
  readonly traceId: string;
}

export async function recordExpense(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'expense.record',
    scopeId: input.scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('expense.record', ctx.traceId, { scopeId: input.scopeId }));
  }

  const serviceClient = createServiceRoleClient();

  const { data: scopeRow, error: scopeErr } = await serviceClient
    .schema('core' as never)
    .from('scopes' as never)
    .select('id, scope_type, chapter_kind, currency_code')
    .eq('id', input.scopeId)
    .maybeSingle();
  if (scopeErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'expenses/record: scope load failed',
        error: scopeErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!scopeRow) return withCors(req, notFound('scope', ctx.traceId));
  const scope = scopeRow as ScopeRow;

  const isFinanceBearing =
    scope.scope_type === 'mainstream' ||
    scope.scope_type === 'branch' ||
    (scope.scope_type === 'chapter' && scope.chapter_kind === 'autonomous');
  if (!isFinanceBearing) {
    return withCors(
      req,
      validationError('Expenses can only be recorded at a finance-bearing scope.', ctx.traceId, {
        scope_type: scope.scope_type,
      }),
    );
  }

  if (scope.currency_code !== input.currency) {
    return withCors(
      req,
      validationError(
        `Expense currency ${input.currency} must match scope currency ${scope.currency_code}.`,
        ctx.traceId,
        { expenseCurrency: input.currency, scopeCurrency: scope.currency_code },
      ),
    );
  }

  // Threshold lookup.
  const { data: settingsRow } = await serviceClient
    .schema('finance' as never)
    .from('expense_settings' as never)
    .select('approval_threshold_amount, approval_threshold_currency')
    .eq('scope_id', input.scopeId)
    .maybeSingle();
  const settings = (settingsRow ?? {}) as SettingsRow;

  const threshold =
    settings.approval_threshold_amount !== null && settings.approval_threshold_amount !== undefined
      ? parseFloat(settings.approval_threshold_amount)
      : null;
  const status: 'recorded' | 'pending_approval' =
    threshold !== null && input.amount >= threshold ? 'pending_approval' : 'recorded';

  const { data: row, error: insertErr } = await serviceClient
    .schema('finance' as never)
    .from('expenses' as never)
    .insert({
      scope_id: input.scopeId,
      category_id: input.categoryId ?? null,
      payee: input.payee,
      amount: input.amount,
      currency: input.currency,
      description: input.description ?? null,
      attachment_url: input.attachmentUrl ?? null,
      status,
      recorded_by: ctx.userId,
      incurred_at: input.incurredAt ?? new Date().toISOString(),
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr || !row) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'expenses/record: insert failed',
        code: insertErr?.code,
        error: insertErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const id = (row as { id: string }).id;

  await logEvent(serviceClient, ctx, {
    action: 'expense.recorded',
    entitySchema: 'finance',
    entityTable: 'expenses',
    entityId: id,
    scopeId: input.scopeId,
    metadata: {
      payee: input.payee,
      amount: input.amount,
      currency: input.currency,
      status,
      threshold,
    },
  });

  const body: SuccessBody = { id, status, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}
