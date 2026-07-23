'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server actions for the Groups admin surface. Every write is a thin
 * relay onto the /groups/* edge functions per ADR-0033 — the edge fns
 * own auth, validation, and the atomic "group + default donation
 * campaign" insert.
 */

export type ActionResult<T = unknown> =
  { ok: true; data?: T; message?: string } | { ok: false; message: string };

interface CreateGroupInput {
  readonly slug: string;
  readonly name: string;
  readonly description?: string | null;
  readonly startsOn?: string | null;
  readonly endsOn?: string | null;
  readonly showInSidebar?: boolean;
}

export async function createGroup(
  input: CreateGroupInput,
): Promise<ActionResult<{ id: string; slug: string; donationCampaignId: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('groups/create', { body: input });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not create group.') };
  }
  revalidatePath('/finance/groups');
  revalidatePath('/finance', 'layout');
  return {
    ok: true,
    data: (data ?? {}) as { id: string; slug: string; donationCampaignId: string },
  };
}

interface UpdateGroupInput {
  readonly id: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly startsOn?: string | null;
  readonly endsOn?: string | null;
  readonly status?: 'active' | 'closed' | 'archived';
  readonly showInSidebar?: boolean;
}

export async function updateGroup(input: UpdateGroupInput): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('groups/update', { body: input });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not update group.') };
  }
  revalidatePath('/finance/groups');
  revalidatePath(`/finance/groups/${input.id}`);
  revalidatePath('/finance', 'layout');
  return { ok: true };
}
