/**
 * Edge Function: create-member
 *
 * The single writer for `core.members` (per ADR-0033). Called by:
 *   - Exco UI's "Add member" form (E1.7c)
 *   - Excel import confirm step (E1.3, service-role internal path)
 *
 * Auth model:
 *   - Caller has `member.create` at the Mainstream scope (or ancestor).
 *   - INSERT runs under the caller's JWT; RLS is the second line.
 *
 * Duplicate handling (§2.12):
 *   - Server-side lookup on the four signals: email, phone, full_name,
 *     full_name + batch. If ANY fire and the caller didn't send
 *     `force: true`, respond 409 with the signal payload so the UI
 *     can present the conflict to the operator.
 *
 * Default handling:
 *   - `exit_year` defaults to `entry_year + 7` if entry_year is set
 *     and exit_year isn't (§2.10 via defaultExitYear).
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  conflict,
  forbidden,
  internalError,
  success,
  unauthorized,
  validationError,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

// Inlined pure helpers — the Edge Function can't import from
// packages/domain, so we mirror them here. Keep in sync with
// packages/domain/src/members/{duplicate-detection,exit-year}.ts.

interface ExistingRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  batch_scope_id: string;
}
interface Signals {
  sameEmail: string[];
  samePhone: string[];
  sameName: string[];
  sameNameAndBatch: string[];
}
const normalizeName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeEmail = (s: string | null) => (s ? s.trim().toLowerCase() : null);
const normalizePhone = (s: string | null) => (s ? s.trim() : null);

function computeSignals(
  candidate: { fullName: string; email: string | null; phone: string | null; batchScopeId: string },
  rows: ExistingRow[],
): Signals {
  const signals: Signals = { sameEmail: [], samePhone: [], sameName: [], sameNameAndBatch: [] };
  const cEmail = normalizeEmail(candidate.email);
  const cPhone = normalizePhone(candidate.phone);
  const cName = normalizeName(candidate.fullName);
  for (const row of rows) {
    if (cEmail && normalizeEmail(row.email) === cEmail) signals.sameEmail.push(row.id);
    if (cPhone && normalizePhone(row.phone) === cPhone) signals.samePhone.push(row.id);
    const rName = normalizeName(row.full_name);
    if (rName === cName) {
      signals.sameName.push(row.id);
      if (row.batch_scope_id === candidate.batchScopeId) signals.sameNameAndBatch.push(row.id);
    }
  }
  return signals;
}

const hasAnySignal = (s: Signals) =>
  s.sameEmail.length + s.samePhone.length + s.sameName.length + s.sameNameAndBatch.length > 0;

const inputSchema = z
  .object({
    fullName: z.string().min(1).max(200),
    displayName: z.string().max(200).nullish(),
    email: z.string().email().nullish(),
    phone: z.string().min(1).max(40).nullish(),
    batchScopeId: z.string().uuid(),
    houseScopeId: z.string().uuid(),
    networkScopeId: z.string().uuid(),
    field: z.string().max(120).nullish(),
    entryYear: z.number().int().min(1953).max(2100).nullish(),
    exitYear: z.number().int().min(1953).max(2100).nullish(),
    gender: z.string().max(40).nullish(),
    dateOfBirth: z.string().date().nullish(),
    profilePhotoUrl: z.string().url().nullish(),
    currentCountry: z.string().max(80).nullish(),
    currentRegionState: z.string().max(120).nullish(),
    currentCity: z.string().max(120).nullish(),
    force: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) =>
      (v.email !== undefined && v.email !== null) || (v.phone !== undefined && v.phone !== null),
    {
      message: 'email or phone required',
      path: ['email'],
    },
  );

interface SuccessBody {
  memberId: string;
  traceId: string;
}
interface ConflictBody {
  duplicateSignals: Signals;
  traceId: string;
}

export async function createMember(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  // Look up the Mainstream scope for the permission gate.
  const { data: ms } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (!ms) return withCors(req, internalError(ctx.traceId));
  const mainstreamId = (ms as { id: string }).id;

  const allowed = await authorize(supabase, ctx, {
    action: 'member.create',
    scopeId: mainstreamId,
  });
  if (!allowed) {
    return withCors(req, forbidden('member.create', ctx.traceId, { scopeId: mainstreamId }));
  }

  // ── Duplicate check ──────────────────────────────────────────────────
  if (!input.force) {
    const filters: string[] = [];
    if (input.email) filters.push(`email.ilike.${input.email}`);
    if (input.phone) filters.push(`phone.eq.${input.phone}`);
    filters.push(`full_name.ilike.${input.fullName}`);

    const { data: candidates } = await supabase
      .schema('core' as never)
      .from('members' as never)
      .select('id, full_name, email, phone, batch_scope_id')
      .or(filters.join(','))
      .limit(50);

    const signals = computeSignals(
      {
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        batchScopeId: input.batchScopeId,
      },
      (candidates as ExistingRow[]) ?? [],
    );

    if (hasAnySignal(signals)) {
      const body: ConflictBody = { duplicateSignals: signals, traceId: ctx.traceId };
      return withCors(
        req,
        new Response(
          JSON.stringify({
            status: 409,
            code: 'DUPLICATE_MEMBER',
            message: 'One or more duplicate signals fired; resend with force=true to override',
            traceId: ctx.traceId,
            fields: {
              sameEmail: String(signals.sameEmail.length),
              samePhone: String(signals.samePhone.length),
              sameName: String(signals.sameName.length),
              sameNameAndBatch: String(signals.sameNameAndBatch.length),
            },
            body,
          }),
          { status: 409, headers: { 'content-type': 'application/json' } },
        ),
      );
    }
  }

  // ── Default exit_year if entry_year is present ──────────────────────
  const exitYear = input.exitYear ?? (input.entryYear != null ? input.entryYear + 7 : null);

  // ── INSERT ──────────────────────────────────────────────────────────
  const { data: inserted, error: insertErr } = await supabase
    .schema('core' as never)
    .from('members' as never)
    .insert({
      full_name: input.fullName,
      display_name: input.displayName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      batch_scope_id: input.batchScopeId,
      house_scope_id: input.houseScopeId,
      network_scope_id: input.networkScopeId,
      field: input.field ?? null,
      entry_year: input.entryYear ?? null,
      exit_year: exitYear,
      gender: input.gender ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      profile_photo_url: input.profilePhotoUrl ?? null,
      current_country: input.currentCountry ?? null,
      current_region_state: input.currentRegionState ?? null,
      current_city: input.currentCity ?? null,
      created_by: ctx.userId,
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23514') {
      // check_violation — most likely email-or-phone required, entry_year
      // bounds, or the scope-type trigger flagged a bad FK.
      return withCors(
        req,
        validationError('Member row failed a schema invariant', ctx.traceId, {
          _: insertErr.message,
        }),
      );
    }
    if (insertErr.code === '23503') {
      return withCors(
        req,
        validationError('Referenced scope not found', ctx.traceId, { _: insertErr.message }),
      );
    }
    if (insertErr.code === '42501') {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'create-member: RLS rejected after policy allowed (mismatch bug)',
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'create-member: INSERT failed',
        code: insertErr.code,
        error: insertErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const memberId = (inserted as { id: string }).id;

  await logEvent(supabase, ctx, {
    action: 'member.created',
    entitySchema: 'core',
    entityTable: 'members',
    entityId: memberId,
    scopeId: null,
    metadata: {
      batch_scope_id: input.batchScopeId,
      house_scope_id: input.houseScopeId,
      network_scope_id: input.networkScopeId,
      force: input.force === true,
    },
  });

  const body: SuccessBody = { memberId, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}
