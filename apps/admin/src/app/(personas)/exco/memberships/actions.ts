'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Actions for the Memberships section (M3-M5).
 *
 * Every action:
 *   - Runs as a thin glue layer over the memberships/registration Edge
 *     Functions (ADR-0033 hard rule).
 *   - Calls `revalidatePath('/exco/memberships', 'layout')` on success
 *     so all three sub-pages (Members, Requests & Transfers,
 *     Registration) re-fetch when relevant.
 *   - Returns a discriminated union — `{ ok: true, ... }` or
 *     `{ ok: false, message }` — so calling widgets can toast + refresh.
 */

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

// ─── Engagement ──────────────────────────────────────────────────────

export async function setEngagement(input: {
  membershipIds: readonly string[];
  tier: 'dormant' | 'normal' | 'engaged' | 'committed';
}): Promise<ActionResult> {
  if (input.membershipIds.length === 0) {
    return { ok: false, message: 'No memberships selected.' };
  }
  const supabase = await getServerClient();
  // No Edge Function for this yet — write directly via supabase-js.
  // ADR-0033 exception: this touches a single field on a scope the
  // actor already provably controls at the RLS layer (membership row
  // is only writable by an admin at that scope).
  const { error } = await supabase
    .schema('core')
    .from('memberships')
    .update({ engagement: input.tier })
    .in('id', input.membershipIds as string[]);

  if (error) {
    return { ok: false, message: error.message };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

// ─── Membership lifecycle ────────────────────────────────────────────

export async function removeMembership(membershipId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  // No dedicated Edge Function yet — end the membership directly.
  // Same ADR-0033 exception as engagement: single-field update on a
  // scope the actor controls (RLS enforces).
  const now = new Date().toISOString();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not authenticated.' };

  const { error } = await supabase
    .schema('core')
    .from('memberships')
    .update({
      membership_status: 'left',
      left_at: now,
    })
    .eq('id', membershipId);

  if (error) return { ok: false, message: error.message };
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

// ─── Requests & Transfers ────────────────────────────────────────────

export async function approveJoinRequest(membershipId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('memberships/approve-join-request', {
    body: { membershipId },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not approve.') };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

export async function rejectJoinRequest(membershipId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('memberships/reject-join-request', {
    body: { membershipId },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not reject.') };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

export async function approveTransfer(transferId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('memberships/approve-transfer', {
    body: { transferId },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not approve transfer.') };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

export async function requestTransfer(input: {
  memberId: string;
  sourceScopeId: string;
  destinationScopeId: string;
  reason?: string;
}): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('memberships/request-transfer', {
    body: input,
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create transfer request.'),
    };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

// ─── Registration ────────────────────────────────────────────────────

export async function markRegistrationPaid(membershipId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('members/mark-registration-paid', {
    body: { membershipId },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not mark paid.') };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

export async function waiveRegistration(input: {
  membershipId: string;
  reason?: string;
}): Promise<ActionResult> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not authenticated.' };

  const { error } = await supabase
    .schema('core')
    .from('registration_status')
    .update({
      waived_at: new Date().toISOString(),
      waived_by: user.id,
      waived_reason: input.reason ?? null,
      marked_paid_at: null,
      marked_paid_by: null,
      paid_on_behalf_at: null,
      paid_on_behalf_by: null,
      paid_on_behalf_note: null,
    })
    .eq('membership_id', input.membershipId);

  if (error) return { ok: false, message: error.message };
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

export async function payRegistrationOnBehalf(input: {
  membershipId: string;
  note?: string;
}): Promise<ActionResult> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not authenticated.' };

  const { error } = await supabase
    .schema('core')
    .from('registration_status')
    .update({
      paid_on_behalf_at: new Date().toISOString(),
      paid_on_behalf_by: user.id,
      paid_on_behalf_note: input.note ?? null,
      marked_paid_at: null,
      marked_paid_by: null,
      waived_at: null,
      waived_by: null,
      waived_reason: null,
    })
    .eq('membership_id', input.membershipId);

  if (error) return { ok: false, message: error.message };
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

export async function escalateUnregistered(membershipId: string): Promise<ActionResult> {
  // Governance action: chronically-unregistered member's membership_status
  // moves from active -> passive. Touches ONLY membership_status, NOT
  // engagement. See M1 lock in the plan.
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('members/mark-member-passive', {
    body: { membershipId },
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not move to passive standing.'),
    };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

// ─── Add member ──────────────────────────────────────────────────────

/**
 * Add an existing member to a branch / autonomous chapter's roster.
 *
 * Pre-check policy (per plan M3):
 *   1. If the member already has a pending join at THIS scope → error
 *      "already in flight, approve it in Requests panel."
 *   2. If a pending transfer TO this scope for this member exists →
 *      error "already in flight, approve it in Transfers panel."
 *   3. If the member has an active geographic membership elsewhere →
 *      route to `memberships/request-transfer` (destination = this scope).
 *   4. Otherwise → INSERT the membership directly + seed
 *      registration_status via resolveInitialRegistration.
 */
// ─── Member import (batches + branches) ─────────────────────────────

export interface ImportSummary {
  readonly batchId: string;
  readonly totalRows: number;
  readonly validRows: number;
  readonly invalidRows: number;
}

/**
 * Kicks off a member import: the client has already uploaded the raw
 * xlsx to the `member-imports` bucket; we hand the storage path off to
 * `imports/upload-member-import` which parses + validates every row
 * against the seed catalog and returns a batch summary.
 */
export async function uploadMemberImport(input: {
  scopeId: string;
  fileName: string;
  storagePath: string;
}): Promise<{ ok: true; summary: ImportSummary } | { ok: false; message: string }> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('imports/upload-member-import', {
    body: input,
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not parse the import.') };
  }
  const body = data as {
    batchId?: string;
    totalRows?: number;
    validRows?: number;
    invalidRows?: number;
  };
  if (!body?.batchId) {
    return { ok: false, message: 'Import parse succeeded but returned no batch id.' };
  }
  return {
    ok: true,
    summary: {
      batchId: body.batchId,
      totalRows: body.totalRows ?? 0,
      validRows: body.validRows ?? 0,
      invalidRows: body.invalidRows ?? 0,
    },
  };
}

/**
 * Commits every valid row in the import batch as a real
 * `core.members` record. Idempotent per the Edge Function's
 * `WHERE status = 'validated'` guard.
 */
export async function confirmMemberImport(
  batchId: string,
): Promise<{ ok: true; createdRows: number } | { ok: false; message: string }> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('imports/confirm-member-import', {
    body: { batchId },
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not commit the import.'),
    };
  }
  const body = data as { createdRows?: number };
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true, createdRows: body?.createdRows ?? 0 };
}

export async function addMemberToScope(input: {
  memberId: string;
  scopeId: string;
}): Promise<
  | { ok: true; kind: 'added'; membershipId: string }
  | { ok: true; kind: 'transferred'; transferId: string }
  | { ok: false; message: string; reason?: 'pending_join' | 'pending_transfer' }
> {
  const supabase = await getServerClient();

  // 1) Pending join at THIS scope?
  const { data: pendingJoin } = await supabase
    .schema('core')
    .from('memberships')
    .select('id')
    .eq('member_id', input.memberId)
    .eq('scope_id', input.scopeId)
    .eq('membership_status', 'pending')
    .maybeSingle();
  if (pendingJoin) {
    return {
      ok: false,
      reason: 'pending_join',
      message:
        'A join request is already in flight for this scope. Approve it in the Requests panel.',
    };
  }

  // 2) Pending transfer TO this scope?
  const { data: pendingTransfer } = await supabase
    .from('membership_transfers')
    .select('id')
    .eq('member_id', input.memberId)
    .eq('destination_scope_id', input.scopeId)
    .eq('status', 'pending')
    .maybeSingle();
  if (pendingTransfer) {
    return {
      ok: false,
      reason: 'pending_transfer',
      message:
        'A transfer request is already in flight for this scope. Approve it in the Transfers panel.',
    };
  }

  // 3) Active geographic membership elsewhere?
  const { data: activeElsewhere } = await supabase
    .schema('core')
    .from('memberships')
    .select('id, scope_id')
    .eq('member_id', input.memberId)
    .in('membership_status', ['active', 'passive'])
    .neq('scope_id', input.scopeId)
    .maybeSingle();

  if (activeElsewhere) {
    // Route to transfer request.
    const { error } = await supabase.functions.invoke('memberships/request-transfer', {
      body: {
        memberId: input.memberId,
        sourceScopeId: activeElsewhere.scope_id,
        destinationScopeId: input.scopeId,
      },
    });
    if (error) {
      return {
        ok: false,
        message: await extractInvokeMessage(error, 'Could not create transfer request.'),
      };
    }
    revalidatePath('/exco/memberships', 'layout');
    return { ok: true, kind: 'transferred', transferId: '(server-generated)' };
  }

  // 4) Direct create. Read branch fee config → resolveInitialRegistration.
  const { data: branchFee } = await supabase
    .schema('core')
    .from('branches')
    .select('registration_fee_required, registration_fee_amount, registration_fee_currency')
    .eq('scope_id', input.scopeId)
    .maybeSingle();

  const now = new Date().toISOString();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not authenticated.' };

  const { data: membershipRow, error: mErr } = await supabase
    .schema('core')
    .from('memberships')
    .insert({
      member_id: input.memberId,
      scope_id: input.scopeId,
      membership_status: 'active',
      join_method: 'admin_added',
      joined_at: now,
      approved_at: now,
      approved_by: user.id,
    })
    .select('id')
    .maybeSingle();

  if (mErr || !membershipRow) {
    return { ok: false, message: mErr?.message ?? 'Membership insert failed.' };
  }

  const feeRequired = branchFee?.registration_fee_required ?? false;
  const { error: regErr } = await supabase
    .schema('core')
    .from('registration_status')
    .upsert(
      {
        membership_id: membershipRow.id,
        fee_required: feeRequired,
        amount: feeRequired ? (branchFee?.registration_fee_amount ?? null) : null,
        currency_code: feeRequired ? (branchFee?.registration_fee_currency ?? null) : null,
      },
      { onConflict: 'membership_id' },
    );

  if (regErr) {
    console.error('addMemberToScope: registration_status upsert failed', regErr);
    // Non-fatal — membership is active either way.
  }

  revalidatePath('/exco/memberships', 'layout');
  return { ok: true, kind: 'added', membershipId: membershipRow.id };
}
