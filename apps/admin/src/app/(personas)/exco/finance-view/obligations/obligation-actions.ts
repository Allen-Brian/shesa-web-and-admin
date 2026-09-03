'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Action for the Branch Admin's Obligations page.
 *
 * Wraps the `payments/record-manual` Edge Function so a branch admin
 * can settle a scope-body obligation (levy from Mainstream owed by
 * their branch) directly from the obligations row. The Edge Function
 * enforces `payment.record` at the obligation's scope — if the branch
 * admin lacks it the error surfaces as a toast.
 */

export type PaymentMethod = 'mtn_momo' | 'orange_money' | 'cash' | 'bank_transfer' | 'card';

export type ActionResult<T = unknown> =
  { ok: true; data?: T; message?: string } | { ok: false; message: string };

interface Input {
  readonly obligationId: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: PaymentMethod;
  readonly memo?: string;
  readonly externalRef?: string;
}

export async function recordObligationPayment(input: Input): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('payments/record-manual', {
    body: {
      obligationId: input.obligationId,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      memo: input.memo,
      externalRef: input.externalRef,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not record payment.'),
    };
  }
  // Refresh the obligations list so the paid + outstanding numbers
  // reflect the new settlement. The Finance persona has its own
  // revalidate path in its actions.ts so we don't need to touch that.
  revalidatePath('/exco/finance-view/obligations');
  return { ok: true, data: (data ?? {}) as { id: string } };
}
