'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Actions for the Charges page.
 *
 * Every action is a thin glue layer over the /charges/* Edge Functions
 * (M2A) per ADR-0033. The edge fns own auth (charge.create /
 * charge.update / charge.archive), Zod validation, shape-specific
 * rules, and audit. This module just relays.
 */

export type ActionResult<T = unknown> =
  { ok: true; data?: T; message?: string } | { ok: false; message: string };

interface CreateChargeTargetInput {
  readonly targetScopeId: string;
  readonly amount: number;
}

interface CreateChargeInput {
  readonly scopeId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly baseAmount: number;
  readonly currency: string;
  readonly recurrence: 'one_time' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';
  readonly recurrenceInterval?: number;
  readonly activationDate: string;
  readonly issueDate?: string;
  readonly targetPartyType: 'member' | 'branch';
  readonly chargeTargets?: readonly CreateChargeTargetInput[];
}

export async function createCharge(
  input: CreateChargeInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('charges/create', {
    body: {
      scopeId: input.scopeId,
      shape: 'charge',
      name: input.name,
      description: input.description ?? null,
      baseAmount: input.baseAmount,
      currency: input.currency,
      recurrence: input.recurrence,
      recurrenceInterval: input.recurrenceInterval ?? 1,
      activationDate: input.activationDate,
      issueDate: input.issueDate ?? input.activationDate,
      targetPartyType: input.targetPartyType,
      chargeTargets: input.targetPartyType === 'branch' ? (input.chargeTargets ?? []) : undefined,
    },
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not create charge.') };
  }

  revalidatePath('/finance/charges');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}

interface UpdateChargeInput {
  readonly id: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly activationDate?: string;
  readonly status?: 'draft' | 'active' | 'paused';
  readonly baseAmount?: number;
  readonly recurrence?: 'one_time' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';
  readonly chargeTargets?: readonly CreateChargeTargetInput[];
}

export async function updateCharge(
  input: UpdateChargeInput,
): Promise<ActionResult<{ scheduledEffective?: string }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('charges/update', {
    body: input,
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not update charge.') };
  }

  revalidatePath('/finance/charges');
  revalidatePath('/finance/charges/[id]', 'page');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { scheduledEffective?: string } };
}

export async function archiveCharge(id: string, reason?: string): Promise<ActionResult> {
  const supabase = await getServerClient();

  const { error } = await supabase.functions.invoke('charges/archive', {
    body: { id, reason },
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not archive charge.') };
  }

  revalidatePath('/finance/charges');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}

export async function generateObligations(
  chargeId: string,
): Promise<ActionResult<{ inserted: number }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('charges/generate-obligations', {
    body: { chargeId },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not generate obligations.'),
    };
  }

  revalidatePath('/finance/charges');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? { inserted: 0 }) as { inserted: number } };
}

export async function deleteCharge(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();

  const { error } = await supabase.functions.invoke('charges/delete', {
    body: { id },
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not delete charge.') };
  }

  revalidatePath('/finance/charges');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}
