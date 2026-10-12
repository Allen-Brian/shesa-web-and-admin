/**
 * Actions: charges/create-exception · update-exception · delete-exception
 *
 * The "rules" that make different members pay different amounts on an
 * individual charge (spec Part XI). Each rule is a condition + a
 * replacement amount attached to a charge; the member never sees the
 * rule, only the resulting number. Resolution is highest-priority-wins,
 * no stacking (finance.resolve_exception_for_charge), and the matched
 * rule is recorded on each obligation so a statement can always explain
 * the figure.
 *
 * Rule forms → finance.exceptions:
 *   batch     (fixed)      → condition.batch_scope_ids[]   · priority 100
 *   recent    (relative)   → condition.max_years_since_exit · priority 500
 *   senior    (senior)     → condition.min_years_since_exit · priority 500
 *   member    (individual) → member_id column               · priority 1000
 *
 * Auth: exception.create at the charge's scope; the individual form
 * additionally requires the sensitive exception.apply_individual.
 * "delete" deactivates (is_active=false) so past obligations keep their
 * explanation; generation simply stops matching it next period.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext, type RequestContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const FORMS = ['fixed', 'relative', 'senior', 'individual'] as const;

const PRIORITY: Record<(typeof FORMS)[number], number> = {
  individual: 1000,
  relative: 500,
  senior: 500,
  fixed: 100,
};

const createSchema = z
  .object({
    chargeId: z.string().uuid(),
    form: z.enum(FORMS),
    replacementAmount: z.number().nonnegative(),
    batchScopeIds: z.array(z.string().uuid()).optional(),
    maxYearsSinceExit: z.number().int().nonnegative().optional(),
    minYearsSinceExit: z.number().int().nonnegative().optional(),
    memberId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.form === 'fixed' && (!v.batchScopeIds || v.batchScopeIds.length === 0))
      ctx.addIssue({
        code: 'custom',
        message: 'Pick at least one batch.',
        path: ['batchScopeIds'],
      });
    if (v.form === 'relative' && v.maxYearsSinceExit === undefined)
      ctx.addIssue({
        code: 'custom',
        message: 'maxYearsSinceExit is required.',
        path: ['maxYearsSinceExit'],
      });
    if (v.form === 'senior' && v.minYearsSinceExit === undefined)
      ctx.addIssue({
        code: 'custom',
        message: 'minYearsSinceExit is required.',
        path: ['minYearsSinceExit'],
      });
    if (v.form === 'individual' && !v.memberId)
      ctx.addIssue({ code: 'custom', message: 'memberId is required.', path: ['memberId'] });
  });

interface ChargeScopeRow {
  readonly id: string;
  readonly scope_id: string;
}

function conditionFor(input: z.infer<typeof createSchema>): Record<string, unknown> {
  switch (input.form) {
    case 'fixed':
      return { batch_scope_ids: input.batchScopeIds };
    case 'relative':
      return { max_years_since_exit: input.maxYearsSinceExit };
    case 'senior':
      return { min_years_since_exit: input.minYearsSinceExit };
    default:
      return {};
  }
}

/** Shared: load a charge's scope and authorize the rule write there. */
async function authorizeForCharge(
  req: Request,
  ctx: RequestContext,
  chargeId: string,
  form: (typeof FORMS)[number],
): Promise<{ ok: true; scopeId: string } | { ok: false; response: Response }> {
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id')
    .eq('id', chargeId)
    .maybeSingle();
  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'exception: charge load failed',
        error: error.message,
      }),
    );
    return { ok: false, response: withCors(req, internalError(ctx.traceId)) };
  }
  if (!data) return { ok: false, response: withCors(req, notFound('charge', ctx.traceId)) };
  const scopeId = (data as ChargeScopeRow).scope_id;

  const userClient = createUserClient(ctx.jwt!);
  const allowed = await authorize(userClient, ctx, { action: 'exception.create', scopeId });
  if (!allowed)
    return {
      ok: false,
      response: withCors(req, forbidden('exception.create', ctx.traceId, { scopeId })),
    };

  // Individual overrides are the sensitive, per-person tier.
  if (form === 'individual') {
    const allowedIndividual = await authorize(userClient, ctx, {
      action: 'exception.apply_individual',
      scopeId,
    });
    if (!allowedIndividual)
      return {
        ok: false,
        response: withCors(req, forbidden('exception.apply_individual', ctx.traceId, { scopeId })),
      };
  }
  return { ok: true, scopeId };
}

export async function createException(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, createSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const auth = await authorizeForCharge(req, ctx, input.chargeId, input.form);
  if (!auth.ok) return auth.response;

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .schema('finance' as never)
    .from('exceptions' as never)
    .insert({
      charge_id: input.chargeId,
      form: input.form,
      condition: conditionFor(input),
      replacement_amount: input.replacementAmount,
      priority: PRIORITY[input.form],
      member_id: input.form === 'individual' ? input.memberId : null,
      created_by: ctx.userId,
    } as never)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'exception: insert failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: input.form === 'individual' ? 'exception.applied_individual' : 'exception.created',
    entitySchema: 'finance',
    entityTable: 'exceptions',
    entityId: (data as { id: string } | null)?.id,
    scopeId: auth.scopeId,
    metadata: {
      chargeId: input.chargeId,
      form: input.form,
      replacementAmount: input.replacementAmount,
    },
  });

  return withCors(
    req,
    success({ id: (data as { id: string } | null)?.id, traceId: ctx.traceId }, 201),
  );
}

const updateSchema = z
  .object({
    id: z.string().uuid(),
    replacementAmount: z.number().nonnegative().optional(),
    batchScopeIds: z.array(z.string().uuid()).optional(),
    maxYearsSinceExit: z.number().int().nonnegative().optional(),
    minYearsSinceExit: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

interface ExceptionRow {
  readonly id: string;
  readonly charge_id: string;
  readonly form: (typeof FORMS)[number];
  readonly condition: Record<string, unknown>;
}

export async function updateException(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, updateSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();
  const { data: existing, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('exceptions' as never)
    .select('id, charge_id, form, condition')
    .eq('id', input.id)
    .maybeSingle();
  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'exception: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('exception', ctx.traceId));
  const row = existing as ExceptionRow;

  const auth = await authorizeForCharge(req, ctx, row.charge_id, row.form);
  if (!auth.ok) return auth.response;

  const patch: Record<string, unknown> = {};
  if (input.replacementAmount !== undefined) patch.replacement_amount = input.replacementAmount;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  // Condition edits, per form.
  const condition = { ...row.condition };
  if (row.form === 'fixed' && input.batchScopeIds !== undefined)
    condition.batch_scope_ids = input.batchScopeIds;
  if (row.form === 'relative' && input.maxYearsSinceExit !== undefined)
    condition.max_years_since_exit = input.maxYearsSinceExit;
  if (row.form === 'senior' && input.minYearsSinceExit !== undefined)
    condition.min_years_since_exit = input.minYearsSinceExit;
  patch.condition = condition;

  const { error: updErr } = await serviceClient
    .schema('finance' as never)
    .from('exceptions' as never)
    .update(patch as never)
    .eq('id', row.id);
  if (updErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'exception: update failed',
        code: updErr.code,
        error: updErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'exception.created',
    entitySchema: 'finance',
    entityTable: 'exceptions',
    entityId: row.id,
    scopeId: auth.scopeId,
    metadata: { chargeId: row.charge_id, form: row.form, updated: Object.keys(patch) },
  });

  return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
}

const deleteSchema = z.object({ id: z.string().uuid() }).strict();

/** Deactivate a rule (is_active=false) — past obligations keep their link. */
export async function deleteException(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, deleteSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();
  const { data: existing, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('exceptions' as never)
    .select('id, charge_id, form, condition')
    .eq('id', input.id)
    .maybeSingle();
  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'exception: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('exception', ctx.traceId));
  const row = existing as ExceptionRow;

  const auth = await authorizeForCharge(req, ctx, row.charge_id, row.form);
  if (!auth.ok) return auth.response;

  const { error: updErr } = await serviceClient
    .schema('finance' as never)
    .from('exceptions' as never)
    .update({ is_active: false } as never)
    .eq('id', row.id);
  if (updErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'exception: deactivate failed',
        code: updErr.code,
        error: updErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'exception.created',
    entitySchema: 'finance',
    entityTable: 'exceptions',
    entityId: row.id,
    scopeId: auth.scopeId,
    metadata: { chargeId: row.charge_id, form: row.form, deactivated: true },
  });

  return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
}
