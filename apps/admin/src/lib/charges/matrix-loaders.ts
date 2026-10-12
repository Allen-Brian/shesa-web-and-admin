import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { loadMemberContacts, type MemberContact } from '@/lib/finance/member-contacts';

import type { RawObligation, RawPayment } from './charge-detail-raw-types';

// Same widening rationale as the branch-import helpers — per-query
// `.schema('finance')` makes the outer generic irrelevant.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * Sub-loaders for the matrix branch of the charge-detail flow. Each
 * runs one query so the outer loader stays a chain of small `await`
 * steps rather than a wall of inline SQL.
 */

export async function loadObligations(
  supabase: AnySupabaseClient,
  chargeId: string,
): Promise<RawObligation[]> {
  const { data } = await supabase
    .schema('finance')
    .from('obligations')
    .select(
      'id, charge_id, party_type, party_id, amount, currency, status, period_start, period_end, prorated',
    )
    .eq('charge_id', chargeId);
  return (data ?? []) as RawObligation[];
}

export async function loadPaymentsByObligations(
  supabase: AnySupabaseClient,
  obligationIds: readonly string[],
): Promise<RawPayment[]> {
  if (obligationIds.length === 0) return [];
  const { data } = await supabase
    .schema('finance')
    .from('payments')
    .select(
      'id, obligation_id, charge_id, payer_member_id, amount, currency, method, source, reverses_payment_id, metadata, created_at',
    )
    .in('obligation_id', obligationIds as string[]);
  return (data ?? []) as RawPayment[];
}

/**
 * Members behind the obligations, with their contact details.
 *
 * This used to resolve names only, which was all the matrix rendered.
 * The exported sheet is chased from — "who still owes, and how do I
 * reach them" is one question, not two — so it resolves the full
 * contact record and the matrix carries it through.
 */
export async function loadMemberNames(
  supabase: AnySupabaseClient,
  memberIds: readonly string[],
): Promise<Map<string, MemberContact>> {
  return loadMemberContacts(supabase, memberIds);
}

/**
 * For each member, the earliest `joined_at` across active/passive
 * memberships at the charge's scope. Used by the matrix view to render
 * "Not applicable" for periods that predate the member joining — so a
 * member who joined in March doesn't show up as "unpaid" for Jan/Feb.
 */
export async function loadMemberJoinedAt(
  supabase: AnySupabaseClient,
  scopeId: string,
  memberIds: readonly string[],
): Promise<Map<string, string | null>> {
  if (memberIds.length === 0) return new Map();
  const { data } = await supabase
    .schema('core')
    .from('memberships')
    .select('member_id, joined_at, membership_status')
    .eq('scope_id', scopeId)
    .in('member_id', memberIds as string[])
    .in('membership_status', ['active', 'passive']);
  const joinedAtByMember = new Map<string, string | null>();
  for (const m of (data ?? []) as Array<{ member_id: string; joined_at: string | null }>) {
    const prev = joinedAtByMember.get(m.member_id);
    if (!m.joined_at) continue;
    if (!prev || new Date(m.joined_at).getTime() < new Date(prev).getTime()) {
      joinedAtByMember.set(m.member_id, m.joined_at);
    }
  }
  return joinedAtByMember;
}

/**
 * For obligations with `party_type='branch'` (the umbrella "scope
 * owes" party type), load the scope names so those rows render with
 * their real label instead of a raw UUID.
 */
export async function loadScopeBodies(
  supabase: AnySupabaseClient,
  scopeIds: readonly string[],
): Promise<Map<string, { id: string; name: string; scope_type: string }>> {
  if (scopeIds.length === 0) return new Map();
  const { data } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, scope_type')
    .in('id', scopeIds as string[]);
  return new Map(
    ((data ?? []) as Array<{ id: string; name: string; scope_type: string }>).map((s) => [s.id, s]),
  );
}
