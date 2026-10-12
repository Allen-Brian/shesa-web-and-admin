'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Actions for the Expenses page.
 *
 * Thin wrappers over /expenses/* edge functions per ADR-0033.
 */

export type ActionResult<T = unknown> =
  { ok: true; data?: T; message?: string } | { ok: false; message: string };

interface RecordExpenseInput {
  readonly scopeId: string;
  readonly categoryId?: string | null;
  readonly payee: string;
  readonly amount: number;
  readonly currency: string;
  readonly description?: string | null;
  readonly attachmentUrl?: string | null;
  readonly incurredAt?: string;
}

export async function recordExpense(
  input: RecordExpenseInput,
): Promise<ActionResult<{ id: string; status: 'recorded' | 'pending_approval' }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('expenses/record', {
    body: input,
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not record expense.') };
  }

  revalidatePath('/finance/expenses');
  revalidatePath('/finance', 'layout');
  return {
    ok: true,
    data: (data ?? { status: 'recorded' }) as {
      id: string;
      status: 'recorded' | 'pending_approval';
    },
  };
}

export async function approveExpense(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('expenses/approve', { body: { id } });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not approve expense.') };
  }
  revalidatePath('/finance/expenses');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}

export async function reverseExpense(
  originalExpenseId: string,
  reason: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('expenses/reverse', {
    body: { originalExpenseId, reason },
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not reverse expense.') };
  }

  revalidatePath('/finance/expenses');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}
