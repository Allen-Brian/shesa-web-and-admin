'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult } from './action-types';

/**
 * Registration-status transitions for a single membership.
 *
 * The paid / waived / on-behalf columns are mutually exclusive (a
 * settled row can only be in one settlement state at a time) — each
 * action here CLEARS the other two settlement columns so re-marking is
 * safe and idempotent.
 */

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

/**
 * Governance action: move a chronically-unregistered member from
 * `active` to `passive` standing. Touches ONLY membership_status,
 * never engagement — see the M1 lock in the plan.
 */
export async function escalateUnregistered(membershipId: string): Promise<ActionResult> {
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
