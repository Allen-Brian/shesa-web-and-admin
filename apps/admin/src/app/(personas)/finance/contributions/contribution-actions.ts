'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Actions for the Contributions page.
 *
 * Thin wrappers over the /charges/* edge functions per ADR-0033.
 * Contributions live in finance.charges with a non-'charge' shape, so
 * the same edge functions apply — approve / close / extend / archive
 * all reject non-contribution shapes at the edge fn level.
 */

export type ActionResult<T = unknown> =
  { ok: true; data?: T; message?: string } | { ok: false; message: string };

type ContributionShape = 'goal' | 'open' | 'ticketed' | 'fixed';

interface CreateContributionInput {
  readonly scopeId: string;
  readonly shape: ContributionShape;
  readonly name: string;
  readonly description?: string | null;
  readonly currency: string;
  readonly goalAmount?: number;
  readonly minAmount?: number;
  readonly baseAmount?: number;
  readonly capacity?: number;
  readonly openDate: string;
  readonly closeDate: string;
  /** Bind this contribution to an event group when created from a group shell. */
  readonly groupId?: string | null;
}

export async function createContribution(
  input: CreateContributionInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();

  const body: Record<string, unknown> = {
    scopeId: input.scopeId,
    shape: input.shape,
    name: input.name,
    description: input.description ?? null,
    currency: input.currency,
    recurrence: 'one_time',
    recurrenceInterval: 1,
    lifecycle: 'draft',
    openDate: input.openDate,
    closeDate: input.closeDate,
    groupId: input.groupId ?? null,
  };
  if (input.shape === 'goal' && input.goalAmount) body.goalAmount = input.goalAmount;
  if (input.shape === 'open' && input.minAmount) body.minAmount = input.minAmount;
  if (input.shape === 'fixed' && input.baseAmount) body.baseAmount = input.baseAmount;
  if (input.shape === 'ticketed') {
    body.baseAmount = input.baseAmount ?? 0;
    if (input.capacity) body.capacity = input.capacity;
  }

  const { data, error } = await supabase.functions.invoke('charges/create', {
    body,
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create contribution.'),
    };
  }

  revalidatePath('/finance/contributions');
  revalidatePath('/finance', 'layout');
  revalidatePath('/finance/groups', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}

export async function approveContribution(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('charges/approve', { body: { id } });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not approve contribution.'),
    };
  }
  revalidatePath('/finance/contributions');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}

export async function closeContribution(id: string, reason?: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('charges/close', { body: { id, reason } });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not close contribution.'),
    };
  }
  revalidatePath('/finance/contributions');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}

export async function extendContribution(
  id: string,
  newCloseDate: string,
  reason?: string,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('charges/extend', {
    body: { id, newCloseDate, reason },
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not extend contribution.'),
    };
  }
  revalidatePath('/finance/contributions');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}

export async function archiveContribution(id: string, reason?: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('charges/archive', {
    body: { id, reason },
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not archive contribution.'),
    };
  }
  revalidatePath('/finance/contributions');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}
