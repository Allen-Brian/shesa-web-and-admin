/**
 * Action: charges/create
 *
 * POST /functions/v1/charges/create — creates a draft charge/contribution
 * at a finance-bearing scope. Per ADR-0033, every write to finance.charges
 * lands here — never through a Server Action's direct supabase-js call.
 *
 * The handler owns:
 *   - Auth (charge.create at scopeId)
 *   - Zod validation of the raw payload
 *   - Shape-specific business-rule validation (mirrors DB CHECKs but
 *     gives a friendlier error before the DB has to fire its own)
 *   - "Only finance-bearing scopes accept charges" — checks scope_type
 *     + chapter_kind up front so we return a clean 422, not a bare
 *     FK violation.
 *   - Currency alignment — charge.currency must match scope.currency_code.
 *   - INSERT and audit.
 *
 * Not owned here (deferred to M2B):
 *   - Obligation generation. Newly-created charges (even active) sit
 *     inert until the generate-obligations edge fn runs against them.
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

// Mirror of the finance.charge_shape enum. Keep in sync with the DB
// enum + packages/domain/src/finance/enums.ts.
const SHAPES = ['charge', 'goal', 'open', 'ticketed', 'fixed', 'donation'] as const;
const RECURRENCES = ['one_time', 'monthly', 'quarterly', 'biannual', 'yearly'] as const;
const LIFECYCLES = ['draft', 'open', 'closed', 'archived'] as const;

const inputSchema = z
  .object({
    scopeId: z.string().uuid(),
    categoryId: z.string().uuid().nullable().optional(),
    shape: z.enum(SHAPES),

    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),

    baseAmount: z.number().nonnegative().nullable().optional(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),

    recurrence: z.enum(RECURRENCES).default('one_time'),
    recurrenceInterval: z.number().int().positive().default(1),

    targetFilter: z.record(z.unknown()).default({}),
    targetPartyType: z.enum(['member', 'branch']).nullable().optional(),
    // Per-target amount rows for Group (target_party_type='branch')
    // charges — mirrors finance.charge_targets. Ignored for Individual
    // charges. Empty array acceptable only when targetPartyType!='branch'.
    chargeTargets: z
      .array(
        z
          .object({
            targetScopeId: z.string().uuid(),
            amount: z.number().positive(),
          })
          .strict(),
      )
      .optional(),

    eventId: z.string().uuid().nullable().optional(),
    // Event group this charge belongs to. Optional; set when creating
    // a contribution from inside a group's shell so the row shows up
    // in that group's Contributions tab. Enforced elsewhere as
    // mainstream-only via the finance.groups trigger on group_id
    // consistency.
    groupId: z.string().uuid().nullable().optional(),
    openDate: z.string().datetime().nullable().optional(),
    closeDate: z.string().datetime().nullable().optional(),
    goalAmount: z.number().positive().nullable().optional(),
    minAmount: z.number().nonnegative().nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    lifecycle: z.enum(LIFECYCLES).nullable().optional(),

    issueDate: z.string().datetime().nullable().optional(),
    activationDate: z.string().datetime().nullable().optional(),
  })
  .strict();

interface SuccessBody {
  readonly id: string;
  readonly traceId: string;
}

interface ScopeRow {
  readonly id: string;
  readonly scope_type: 'mainstream' | 'branch' | 'chapter' | 'batch' | 'house' | 'network';
  readonly chapter_kind: 'autonomous' | 'grouping' | null;
  readonly currency_code: string;
}

export async function createCharge(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const userClient = createUserClient(ctx.jwt);

  // 1) Authorize.
  const allowed = await authorize(userClient, ctx, {
    action: 'charge.create',
    scopeId: input.scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('charge.create', ctx.traceId, { scopeId: input.scopeId }));
  }

  // 2) Fetch scope for currency + finance-bearing check.
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
        message: 'charges/create: scope load failed',
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
      validationError(
        'Charges can only be created at a finance-bearing scope (mainstream / branch / autonomous chapter).',
        ctx.traceId,
        { scope_type: scope.scope_type, chapter_kind: scope.chapter_kind ?? 'null' },
      ),
    );
  }

  // Charge-kind ↔ scope invariant (spec Part III). The kind is fixed by
  // who creates it, and the UI never lets it drift — but enforce it here
  // too so a direct API call can't:
  //   • Group charges (targetPartyType='branch') are levies on other
  //     bodies — only Mainstream may create them.
  //   • Individual charges (targetPartyType='member') bill a body's own
  //     members — Mainstream has none of its own to charge.
  if (input.targetPartyType === 'branch' && scope.scope_type !== 'mainstream') {
    return withCors(
      req,
      validationError(
        'Only Mainstream can create group (levy) charges on branches, chapters, or batches.',
        ctx.traceId,
        { scope_type: scope.scope_type },
      ),
    );
  }
  if (input.targetPartyType === 'member' && scope.scope_type === 'mainstream') {
    return withCors(
      req,
      validationError(
        'Mainstream cannot charge individuals — create a group levy on branches/chapters/batches instead.',
        ctx.traceId,
        { scope_type: scope.scope_type },
      ),
    );
  }

  if (scope.currency_code !== input.currency) {
    return withCors(
      req,
      validationError(
        `Charge currency ${input.currency} must match scope currency ${scope.currency_code}.`,
        ctx.traceId,
        { chargeCurrency: input.currency, scopeCurrency: scope.currency_code },
      ),
    );
  }

  // 3) Shape-specific rules (mirrors DB CHECKs; better error surface).
  const shapeIssues = validateShapeRules(input);
  if (shapeIssues.length > 0) {
    return withCors(
      req,
      validationError(shapeIssues[0]!.message, ctx.traceId, {
        field: shapeIssues[0]!.field,
      }),
    );
  }

  // 4) Non-obligation-creating shapes MUST use recurrence='one_time' —
  //    contribution shapes have a bounded window, not a schedule.
  const recurrence =
    input.shape === 'charge' || input.shape === 'fixed' ? input.recurrence : 'one_time';

  // 4b) Individual vs Group target-list invariants. The DB triggers
  //     enforce this too, but we catch it here so the client gets a
  //     friendly 422 instead of an opaque trigger error.
  const isGroupCharge = input.targetPartyType === 'branch';
  const chargeTargets = input.chargeTargets ?? [];
  if (isGroupCharge && chargeTargets.length === 0) {
    return withCors(
      req,
      validationError(
        'A Group charge needs at least one target scope with a positive amount.',
        ctx.traceId,
        { field: 'chargeTargets' },
      ),
    );
  }
  if (!isGroupCharge && chargeTargets.length > 0) {
    return withCors(
      req,
      validationError('chargeTargets can only be set when targetPartyType="branch".', ctx.traceId, {
        field: 'chargeTargets',
      }),
    );
  }
  if (isGroupCharge) {
    const seen = new Set<string>();
    for (const t of chargeTargets) {
      if (seen.has(t.targetScopeId)) {
        return withCors(
          req,
          validationError('Duplicate target scope in chargeTargets.', ctx.traceId, {
            field: 'chargeTargets',
            targetScopeId: t.targetScopeId,
          }),
        );
      }
      seen.add(t.targetScopeId);
    }
  }

  // 5) INSERT (bypass RLS via service-role — writes go through this
  //    handler by design; the auth check above is the guard).
  const { data: row, error: insertErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .insert({
      scope_id: input.scopeId,
      category_id: input.categoryId ?? null,
      shape: input.shape,
      name: input.name,
      description: input.description ?? null,
      base_amount: input.baseAmount ?? null,
      currency: input.currency,
      recurrence,
      recurrence_interval: input.recurrenceInterval,
      target_filter: input.targetFilter,
      target_party_type: input.targetPartyType ?? null,
      event_id: input.eventId ?? null,
      group_id: input.groupId ?? null,
      open_date: input.openDate ?? null,
      close_date: input.closeDate ?? null,
      goal_amount: input.goalAmount ?? null,
      min_amount: input.minAmount ?? null,
      capacity: input.capacity ?? null,
      lifecycle: input.lifecycle ?? null,
      issue_date: input.issueDate ?? null,
      activation_date: input.activationDate ?? null,
      status: 'draft',
      created_by: ctx.userId,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr || !row) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/create: insert failed',
        code: insertErr?.code,
        error: insertErr?.message,
      }),
    );
    // A DB-level CHECK constraint that slipped past our earlier validation
    // surfaces as 23514. Map that to 422 for a cleaner client experience.
    if (insertErr?.code === '23514') {
      return withCors(req, validationError(insertErr.message, ctx.traceId));
    }
    return withCors(req, internalError(ctx.traceId));
  }

  const id = (row as { id: string }).id;

  // 6) For Group charges, insert the per-target amount rows. If any
  //    row fails (bad FK, currency mismatch, RLS reject) we DELETE the
  //    freshly-created charge so we never leave a Group charge with an
  //    empty target list — the trigger contract expects at least one.
  if (isGroupCharge && chargeTargets.length > 0) {
    const rows = chargeTargets.map((t) => ({
      charge_id: id,
      target_scope_id: t.targetScopeId,
      amount: t.amount,
      currency: input.currency,
    }));
    const { error: targetErr } = await serviceClient
      .schema('finance' as never)
      .from('charge_targets' as never)
      .insert(rows as never);
    if (targetErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'charges/create: charge_targets insert failed — rolling back charge',
          chargeId: id,
          code: targetErr.code,
          error: targetErr.message,
        }),
      );
      await serviceClient
        .schema('finance' as never)
        .from('charges' as never)
        .delete()
        .eq('id', id);
      if (targetErr.code === '23514' || targetErr.code === '23503') {
        return withCors(req, validationError(targetErr.message, ctx.traceId));
      }
      return withCors(req, internalError(ctx.traceId));
    }
  }

  await logEvent(serviceClient, ctx, {
    action: 'charge.created',
    entitySchema: 'finance',
    entityTable: 'charges',
    entityId: id,
    scopeId: input.scopeId,
    metadata: {
      shape: input.shape,
      name: input.name,
      currency: input.currency,
      targetPartyType: input.targetPartyType ?? 'member',
      targetCount: chargeTargets.length,
    },
  });

  const body: SuccessBody = { id, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}

// ─── Local shape validator ─────────────────────────────────────────────
// Mirror of packages/domain/src/finance/charges.ts validateChargeInput.
// Duplicated here because the Edge Function's Deno runtime can't
// import npm packages that reference @shesa workspace deps. The two must
// stay aligned; when a rule changes, update both.

interface Issue {
  readonly field: string;
  readonly message: string;
}

function validateShapeRules(input: z.infer<typeof inputSchema>): readonly Issue[] {
  const issues: Issue[] = [];
  const shape = input.shape;

  if (shape === 'charge' || shape === 'fixed' || shape === 'ticketed') {
    if (input.baseAmount == null || input.baseAmount <= 0) {
      issues.push({
        field: 'baseAmount',
        message: `Shape "${shape}" requires a positive baseAmount.`,
      });
    }
  }
  if (shape === 'goal' || shape === 'open' || shape === 'donation') {
    if (input.baseAmount != null && input.baseAmount !== 0) {
      issues.push({
        field: 'baseAmount',
        message: `Shape "${shape}" must not carry a baseAmount.`,
      });
    }
  }
  if (input.goalAmount != null && shape !== 'goal') {
    issues.push({ field: 'goalAmount', message: `goalAmount is only valid on shape="goal".` });
  }
  if (shape === 'goal' && (input.goalAmount == null || input.goalAmount <= 0)) {
    issues.push({ field: 'goalAmount', message: `Shape "goal" requires a positive goalAmount.` });
  }
  if (input.capacity != null && shape !== 'ticketed') {
    issues.push({ field: 'capacity', message: `capacity is only valid on shape="ticketed".` });
  }
  const isContribution = shape !== 'charge';
  if (isContribution && !input.lifecycle) {
    issues.push({
      field: 'lifecycle',
      message: `Shape "${shape}" requires a lifecycle.`,
    });
  }
  if (!isContribution && input.lifecycle) {
    issues.push({
      field: 'lifecycle',
      message: `Shape "charge" must not carry a lifecycle.`,
    });
  }
  if (input.openDate && input.closeDate) {
    if (new Date(input.closeDate).getTime() < new Date(input.openDate).getTime()) {
      issues.push({ field: 'closeDate', message: `closeDate must be on or after openDate.` });
    }
  }
  const needsWindow = ['goal', 'open', 'ticketed', 'fixed'];
  if (needsWindow.includes(shape) && (!input.openDate || !input.closeDate)) {
    issues.push({
      field: 'openDate',
      message: `Shape "${shape}" requires openDate + closeDate.`,
    });
  }
  const createsObligations = shape === 'charge' || shape === 'fixed';
  if (!createsObligations && input.recurrence !== 'one_time') {
    issues.push({
      field: 'recurrence',
      message: `Shape "${shape}" must use recurrence="one_time".`,
    });
  }
  if (shape === 'charge' && !input.activationDate) {
    issues.push({
      field: 'activationDate',
      message: `Shape "charge" requires an activationDate.`,
    });
  }

  return issues;
}
