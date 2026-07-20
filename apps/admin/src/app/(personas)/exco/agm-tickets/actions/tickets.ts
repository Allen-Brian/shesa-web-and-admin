'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { AgmTicketStatus } from '../widgets/types';

type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Flip a ticket's status. The Site Administrator uses this to cancel
 * a registration; Finance uses it to reconcile issued → paid once the
 * money lands.
 */
export async function setAgmTicketStatus(
  id: string,
  status: AgmTicketStatus,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('cms' as never)
    .from('agm_tickets' as never)
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };

  revalidatePath('/exco/agm-tickets');
  revalidatePath('/finance/agm-tickets');
  return { ok: true };
}
