/**
 * Edge Function: approve-join-request
 *
 * Transitions a `pending` membership row to `active`, stamping
 * approved_at + approved_by. Requires `membership.approve` at the
 * target scope. Idempotent: an already-active row returns 200 as-is.
 *
 * 2026-07-03 (M1): also seeds/repairs the row's `core.registration_status`
 * entry using the destination branch's current fee config, via the
 * inline `resolveInitialRegistration` mirror. Keep in sync with
 * packages/domain/src/memberships/initial-registration.ts — the same
 * mapping runs at every creation path (direct add, batch import, this
 * approve flow). PR-review rule.
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
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z.object({ membershipId: z.string().uuid() }).strict();

/**
 * Inline mirror of `resolveInitialRegistration` from
 * packages/domain/src/memberships/initial-registration.ts. Deno can't
 * import from packages/domain directly, so we duplicate the (small)
 * mapping and rely on a matching pgTAP/vitest test to catch drift.
 */
interface InitialRegistration {
  fee_required: boolean;
  amount: number | null;
  currency_code: string | null;
}
function resolveInitialRegistration(config: {
  registration_fee_required: boolean;
  registration_fee_amount: number | null;
  registration_fee_currency: string | null;
}): InitialRegistration {
  if (!config.registration_fee_required) {
    return { fee_required: false, amount: null, currency_code: null };
  }
  return {
    fee_required: true,
    amount: config.registration_fee_amount,
    currency_code: config.registration_fee_currency,
  };
}

export async function approveJoinRequest(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const { membershipId } = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: current } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .select('id, scope_id, membership_status')
    .eq('id', membershipId)
    .maybeSingle();
  if (!current) return withCors(req, notFound('membership', ctx.traceId));
  const row = current as { scope_id: string; membership_status: string };

  const allowed = await authorize(supabase, ctx, {
    action: 'membership.approve',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('membership.approve', ctx.traceId, { scopeId: row.scope_id }));
  }

  if (row.membership_status === 'active') {
    return withCors(
      req,
      success({ membershipId, status: 'active', alreadyActive: true, traceId: ctx.traceId }),
    );
  }
  if (row.membership_status !== 'pending') {
    return withCors(
      req,
      conflict(
        'MEMBERSHIP_NOT_PENDING',
        `cannot approve a membership in status ${row.membership_status}`,
        ctx.traceId,
      ),
    );
  }

  const { error } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .update({
      membership_status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: ctx.userId,
      joined_at: new Date().toISOString(),
    } as never)
    .eq('id', membershipId)
    .eq('membership_status', 'pending');

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'approve-join-request: UPDATE failed',
        code: error.code,
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  // Seed / refresh the registration_status row using the destination
  // branch's current fee config. `resolveInitialRegistration` is the
  // shared mapping — every creation path must call it, so the
  // approve-flow doesn't fall behind the direct-add path.
  //
  // If the branch is actually a batch or non-branch scope, the fee
  // fields are absent (batches have no fee) and we fall back to
  // fee_required=FALSE. The ON CONFLICT clause makes this idempotent
  // if a previous run already created the row.
  const { data: destBranch } = await supabase
    .schema('core' as never)
    .from('branches' as never)
    .select('registration_fee_required, registration_fee_amount, registration_fee_currency')
    .eq('scope_id', row.scope_id)
    .maybeSingle();

  const feeConfig = destBranch
    ? (destBranch as {
        registration_fee_required: boolean;
        registration_fee_amount: number | null;
        registration_fee_currency: string | null;
      })
    : {
        registration_fee_required: false,
        registration_fee_amount: null,
        registration_fee_currency: null,
      };
  const reg = resolveInitialRegistration(feeConfig);

  const { error: regErr } = await supabase
    .schema('core' as never)
    .from('registration_status' as never)
    .upsert(
      {
        membership_id: membershipId,
        fee_required: reg.fee_required,
        amount: reg.amount,
        currency_code: reg.currency_code,
      } as never,
      { onConflict: 'membership_id' },
    );

  if (regErr) {
    // Non-fatal — the membership is active either way. Registration
    // state can be re-derived later; log for observability.
    console.error(
      JSON.stringify({
        level: 'warn',
        traceId: ctx.traceId,
        message: 'approve-join-request: registration_status upsert failed',
        code: regErr.code,
        error: regErr.message,
      }),
    );
  }

  await logEvent(supabase, ctx, {
    action: 'membership.approved',
    entitySchema: 'core',
    entityTable: 'memberships',
    entityId: membershipId,
    scopeId: row.scope_id,
  });

  return withCors(
    req,
    success({ membershipId, status: 'active', alreadyActive: false, traceId: ctx.traceId }),
  );
}
