'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Actions for the Payments page.
 *
 * Thin wrappers over payments/* edge functions per ADR-0033.
 */

export type ActionResult<T = unknown> =
  { ok: true; data?: T; message?: string } | { ok: false; message: string };

export type PaymentMethod = 'mtn_momo' | 'orange_money' | 'cash' | 'bank_transfer' | 'card';

interface RecordManualInput {
  readonly chargeId?: string;
  readonly obligationId?: string;
  readonly payerMemberId?: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: PaymentMethod;
  readonly memo?: string;
  readonly externalRef?: string;
}

export async function recordManualPayment(
  input: RecordManualInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('payments/record-manual', {
    body: input,
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not record payment.') };
  }

  revalidatePath('/finance/payments');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}

interface PayOnBehalfInput {
  readonly chargeId?: string;
  readonly obligationId?: string;
  readonly beneficiaryMemberId: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: PaymentMethod;
  readonly note?: string;
}

export async function payOnBehalf(input: PayOnBehalfInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('payments/pay-on-behalf', {
    body: input,
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not record pay-on-behalf.'),
    };
  }

  revalidatePath('/finance/payments');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}

export async function reversePayment(
  originalPaymentId: string,
  reason: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('payments/reverse', {
    body: { originalPaymentId, reason },
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not reverse payment.') };
  }

  revalidatePath('/finance/payments');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}
