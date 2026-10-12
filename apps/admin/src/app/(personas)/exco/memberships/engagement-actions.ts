'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult } from './action-types';

/**
 * Bulk-update engagement tier on the selected memberships.
 *
 * ADR-0033 exception: this writes a single field on a scope the actor
 * already provably controls at the RLS layer (a membership row is only
 * writable by an admin at that scope), so it bypasses the "server
 * actions must delegate to an Edge Function" rule.
 */
export async function setEngagement(input: {
  membershipIds: readonly string[];
  tier: 'dormant' | 'normal' | 'engaged' | 'committed' | 'pillar';
}): Promise<ActionResult> {
  if (input.membershipIds.length === 0) {
    return { ok: false, message: 'No memberships selected.' };
  }
  const supabase = await getServerClient();
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
