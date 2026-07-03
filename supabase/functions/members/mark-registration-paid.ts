/**
 * Edge Function: mark-registration-paid
 *
 * Flips a member's registration_status row to paid — a NON-GATING
 * flag. The membership stays active regardless; this exists so
 * Exco can filter "unregistered members" to follow up
 * (waive / pay-on-behalf / eject). See Phase 1 §2.13 + E1.7c filter.
 *
 * Requires `registration.mark_paid` at the membership's scope.
 * If no registration_status row exists yet, this function upserts
 * one — an operator marking a member paid before the fee has been
 * formally recorded doesn't need a two-step dance.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    membershipId: z.string().uuid(),
    amount: z.number().nonnegative().optional(),
    currencyCode: z.string().length(3).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export async function markRegistrationPaid(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: membership } = await supabase
    .schema('core' as never)
    .from('memberships' as never)
    .select('id, scope_id')
    .eq('id', input.membershipId)
    .maybeSingle();
  if (!membership) return withCors(req, notFound('membership', ctx.traceId));
  const m = membership as { scope_id: string };

  const allowed = await authorize(supabase, ctx, {
    action: 'registration.mark_paid',
    scopeId: m.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('registration.mark_paid', ctx.traceId, { scopeId: m.scope_id }));
  }

  const nowIso = new Date().toISOString();

  const { data: existing } = await supabase
    .from('registration_status' as never)
    .select('id, marked_paid_at')
    .eq('membership_id', input.membershipId)
    .maybeSingle();

  let statusRowId: string;
  if (existing) {
    const e = existing as { id: string; marked_paid_at: string | null };
    if (e.marked_paid_at) {
      return withCors(
        req,
        success({ registrationStatusId: e.id, alreadyPaid: true, traceId: ctx.traceId }),
      );
    }
    const { error } = await supabase
      .from('registration_status' as never)
      .update({
        fee_required: true,
        amount: input.amount ?? null,
        currency_code: input.currencyCode ?? 'XAF',
        marked_paid_at: nowIso,
        marked_paid_by: ctx.userId,
        notes: input.notes ?? null,
      } as never)
      .eq('id', e.id);
    if (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'mark-registration-paid: UPDATE failed',
          code: error.code,
          error: error.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    statusRowId = e.id;
  } else {
    const { data: inserted, error } = await supabase
      .from('registration_status' as never)
      .insert({
        membership_id: input.membershipId,
        fee_required: true,
        amount: input.amount ?? null,
        currency_code: input.currencyCode ?? 'XAF',
        marked_paid_at: nowIso,
        marked_paid_by: ctx.userId,
        notes: input.notes ?? null,
      } as never)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'mark-registration-paid: INSERT failed',
          code: error.code,
          error: error.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    statusRowId = (inserted as { id: string }).id;
  }

  await logEvent(supabase, ctx, {
    action: 'registration.marked_paid',
    entitySchema: 'core',
    entityTable: 'registration_status',
    entityId: statusRowId,
    scopeId: m.scope_id,
    metadata: { membershipId: input.membershipId, amount: input.amount ?? null },
  });

  return withCors(
    req,
    success({ registrationStatusId: statusRowId, alreadyPaid: false, traceId: ctx.traceId }),
  );
}
