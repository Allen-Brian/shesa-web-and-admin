'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult } from './action-types';

/**
 * End a membership by marking it as `left`. Same ADR-0033 exception as
 * setEngagement — single-field lifecycle transition on a scope the
 * actor already controls (RLS enforces).
 */
export async function removeMembership(membershipId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
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
