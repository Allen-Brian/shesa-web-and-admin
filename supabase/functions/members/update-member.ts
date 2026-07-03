/**
 * Edge Function: update-member
 *
 * Two disjoint call patterns (§2.8):
 *
 *   A) The member themselves updates their own row. They may edit ONLY
 *      the "self-editable" columns: display_name, current_country,
 *      current_region_state, current_city, profile_photo_url. Attempting
 *      to write any protected column returns 403 with a field list.
 *
 *   B) A member.update holder edits any column on any member row.
 *
 * Which pattern applies is decided by the caller's identity vs the
 * target member. Membership ownership is resolved via
 * `core.member_owned_by` (SECURITY DEFINER). If the caller owns the
 * row AND is trying to write only self-editable fields, path A. If
 * they hold `member.update` at Mainstream, path B. Otherwise 403.
 *
 * The `admin-correct-member` Edge Function is the *dedicated* entry
 * point for admin-only corrections that need a "before/after" diff
 * pinned to a distinct audit action key (`member.corrected`). This
 * function emits `member.updated` instead.
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
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const SELF_EDITABLE = new Set([
  'display_name',
  'current_country',
  'current_region_state',
  'current_city',
  'profile_photo_url',
]);

const inputSchema = z
  .object({
    memberId: z.string().uuid(),
    // Self-editable
    displayName: z.string().max(200).nullable().optional(),
    currentCountry: z.string().max(80).nullable().optional(),
    currentRegionState: z.string().max(120).nullable().optional(),
    currentCity: z.string().max(120).nullable().optional(),
    profilePhotoUrl: z.string().url().nullable().optional(),
    // Admin-only (rejected on the member-self path)
    fullName: z.string().min(1).max(200).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().min(1).max(40).nullable().optional(),
    batchScopeId: z.string().uuid().optional(),
    houseScopeId: z.string().uuid().optional(),
    networkScopeId: z.string().uuid().optional(),
    field: z.string().max(120).nullable().optional(),
    entryYear: z.number().int().min(1953).max(2100).nullable().optional(),
    exitYear: z.number().int().min(1953).max(2100).nullable().optional(),
    gender: z.string().max(40).nullable().optional(),
    dateOfBirth: z.string().date().nullable().optional(),
  })
  .strict();

interface SuccessBody {
  memberId: string;
  updated: string[];
  traceId: string;
}

export async function updateMember(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  // Resolve the requested column set and check whether every touched
  // column is self-editable OR the caller has member.update.
  const inputToColumn: Record<string, string> = {
    displayName: 'display_name',
    currentCountry: 'current_country',
    currentRegionState: 'current_region_state',
    currentCity: 'current_city',
    profilePhotoUrl: 'profile_photo_url',
    fullName: 'full_name',
    email: 'email',
    phone: 'phone',
    batchScopeId: 'batch_scope_id',
    houseScopeId: 'house_scope_id',
    networkScopeId: 'network_scope_id',
    field: 'field',
    entryYear: 'entry_year',
    exitYear: 'exit_year',
    gender: 'gender',
    dateOfBirth: 'date_of_birth',
  };

  const touched: string[] = [];
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(input) as (keyof typeof input)[]) {
    if (key === 'memberId') continue;
    if (input[key] === undefined) continue;
    const column = inputToColumn[key];
    if (!column) continue;
    touched.push(column);
    patch[column] = input[key];
  }

  if (touched.length === 0) {
    const body: SuccessBody = { memberId: input.memberId, updated: [], traceId: ctx.traceId };
    return withCors(req, success(body));
  }

  // Check ownership. If caller owns the row, they can only touch
  // self-editable columns; anything else routes through the member.update
  // path.
  const { data: ownershipRow } = await supabase
    .schema('core' as never)
    .rpc('member_owned_by' as never, {
      p_member_id: input.memberId,
      p_user_id: ctx.userId,
    });
  const isOwner = ownershipRow === true;

  const protectedTouched = touched.filter((c) => !SELF_EDITABLE.has(c));

  if (protectedTouched.length > 0) {
    // Must have member.update at Mainstream to touch these columns.
    const { data: ms } = await supabase
      .schema('core' as never)
      .from('scopes' as never)
      .select('id')
      .eq('scope_type', 'mainstream')
      .maybeSingle();
    if (!ms) return withCors(req, internalError(ctx.traceId));
    const mainstreamId = (ms as { id: string }).id;

    const allowed = await authorize(supabase, ctx, {
      action: 'member.update',
      scopeId: mainstreamId,
    });
    if (!allowed) {
      return withCors(
        req,
        forbidden('member.update', ctx.traceId, {
          protectedFields: protectedTouched.join(','),
        }),
      );
    }
  } else if (!isOwner) {
    // All touched fields are self-editable but the caller isn't the
    // owner — that's a 403 (a non-owner writing self-only fields to
    // someone else's row is nonsense).
    return withCors(req, forbidden('member.update', ctx.traceId, { memberId: input.memberId }));
  }

  // Verify the member exists (surface 404 clearly).
  const { data: existing } = await supabase
    .schema('core' as never)
    .from('members' as never)
    .select('id')
    .eq('id', input.memberId)
    .maybeSingle();
  if (!existing) return withCors(req, notFound('member', ctx.traceId));

  const { error: updateErr } = await supabase
    .schema('core' as never)
    .from('members' as never)
    .update(patch as never)
    .eq('id', input.memberId);

  if (updateErr) {
    if (updateErr.code === '23514') {
      return withCors(
        req,
        validationError('Update violates a member invariant', ctx.traceId, {
          _: updateErr.message,
        }),
      );
    }
    if (updateErr.code === '42501') {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'update-member: RLS rejected after policy allowed (mismatch bug)',
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'update-member: UPDATE failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(supabase, ctx, {
    action: 'member.updated',
    entitySchema: 'core',
    entityTable: 'members',
    entityId: input.memberId,
    scopeId: null,
    metadata: { changed: touched, path: protectedTouched.length > 0 ? 'admin' : 'self' },
  });

  const body: SuccessBody = { memberId: input.memberId, updated: touched, traceId: ctx.traceId };
  return withCors(req, success(body));
}
