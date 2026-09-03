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

  revalidatePath('/finance/transactions');
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

  revalidatePath('/finance/transactions');
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

  revalidatePath('/finance/transactions');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}

/**
 * Mark one or more payments reconciled. Idempotent — payments already
 * reconciled are silently skipped (the underlying UNIQUE(payment_id)
 * ensures no duplicates). `matchedRef` + `notes` apply to every payment
 * in the batch when used from the row action; the mass-action path
 * calls with `matchedRef` + `notes` blank.
 */
export async function markReconciled(
  paymentIds: readonly string[],
  matchedRef: string | null,
  notes: string | null,
): Promise<ActionResult<{ count: number }>> {
  if (paymentIds.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const rows = paymentIds.map((id) => ({
    payment_id: id,
    reconciled_by: user.id,
    matched_ref: matchedRef?.trim() || null,
    notes: notes?.trim() || null,
  }));

  const { error } = await supabase
    .schema('finance')
    .from('reconciliations')
    .upsert(rows as never, { onConflict: 'payment_id', ignoreDuplicates: true });

  if (error) return { ok: false, message: error.message };

  revalidatePath('/finance/transactions');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: { count: paymentIds.length } };
}

/** Undo reconciliation for one or more payments. Presence-based delete. */
export async function undoReconciliation(
  paymentIds: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (paymentIds.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();

  const { error } = await supabase
    .schema('finance')
    .from('reconciliations')
    .delete()
    .in('payment_id', paymentIds);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/finance/transactions');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: { count: paymentIds.length } };
}
