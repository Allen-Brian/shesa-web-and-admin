'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

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
 *
 * Member-import server actions were moved to
 * /exco/clusters/batches/actions.ts on 2026-07-05: batches are the
 * single entry-point for adding members.
 */
export type AddMemberResult =
  | { ok: true; kind: 'added'; membershipId: string }
  | { ok: true; kind: 'transferred'; transferId: string }
  | { ok: false; message: string; reason?: 'pending_join' | 'pending_transfer' };

export async function addMemberToScope(input: {
  memberId: string;
  scopeId: string;
}): Promise<AddMemberResult> {
  const supabase = await getServerClient();

  const conflict = await findExistingRequestConflict(supabase, input);
  if (conflict) return conflict;

  const activeElsewhere = await findActiveMembershipElsewhere(supabase, input);
  if (activeElsewhere) {
    return await routeToTransferRequest(supabase, input, activeElsewhere.scope_id);
  }

  return await directCreateMembership(supabase, input);
}

// ─── Helpers (private to this file) ──────────────────────────────────
// 'use server' forbids EXPORTING non-async symbols but allows them
// internally — these helpers stay local so `addMemberToScope` can read
// as a small orchestrator.

type ServerClient = Awaited<ReturnType<typeof getServerClient>>;

async function findExistingRequestConflict(
  supabase: ServerClient,
  input: { memberId: string; scopeId: string },
): Promise<AddMemberResult | null> {
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
  return null;
}

async function findActiveMembershipElsewhere(
  supabase: ServerClient,
  input: { memberId: string; scopeId: string },
) {
  const { data } = await supabase
    .schema('core')
    .from('memberships')
    .select('id, scope_id')
    .eq('member_id', input.memberId)
    .in('membership_status', ['active', 'passive'])
    .neq('scope_id', input.scopeId)
    .maybeSingle();
  return data;
}

async function routeToTransferRequest(
  supabase: ServerClient,
  input: { memberId: string; scopeId: string },
  sourceScopeId: string,
): Promise<AddMemberResult> {
  const { error } = await supabase.functions.invoke('memberships/request-transfer', {
    body: {
      memberId: input.memberId,
      sourceScopeId,
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

async function directCreateMembership(
  supabase: ServerClient,
  input: { memberId: string; scopeId: string },
): Promise<AddMemberResult> {
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
    // Non-fatal — membership is active either way.
    console.error('addMemberToScope: registration_status upsert failed', regErr);
  }

  revalidatePath('/exco/memberships', 'layout');
  return { ok: true, kind: 'added', membershipId: membershipRow.id };
}
