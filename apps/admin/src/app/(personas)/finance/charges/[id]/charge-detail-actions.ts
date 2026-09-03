'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult } from '../charge-actions';

/**
 * Server Actions for the charge-detail drill-down — the cell side
 * sheet's state-dependent actions. Both are thin relays over the
 * finance Edge Functions (ADR-0033): the edge fn owns auth, validation,
 * and audit. Recording a payment settles an arrears cell; forgiving
 * waives it.
 */

type PaymentMethod = 'mtn_momo' | 'orange_money' | 'cash' | 'bank_transfer' | 'card';

interface RecordObligationPaymentInput {
  readonly obligationId: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: PaymentMethod;
  readonly payerMemberId?: string | null;
  readonly memo?: string | null;
}

/** Record a manual payment against a single obligation (arrears cell). */
export async function recordObligationPayment(
  input: RecordObligationPaymentInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('payments/record-manual', {
    body: {
      obligationId: input.obligationId,
      payerMemberId: input.payerMemberId ?? undefined,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      memo: input.memo ?? undefined,
    },
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not record payment.') };
  }

  revalidatePath('/finance/charges/[id]', 'page');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}

type RuleForm = 'fixed' | 'relative' | 'senior' | 'individual';

interface CreateRuleInput {
  readonly chargeId: string;
  readonly form: RuleForm;
  readonly replacementAmount: number;
  readonly batchScopeIds?: readonly string[];
  readonly maxYearsSinceExit?: number;
  readonly minYearsSinceExit?: number;
  readonly memberId?: string;
}

/** Create a member rule (exception) on an individual charge. */
export async function createRule(input: CreateRuleInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('charges/create-exception', {
    body: input,
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not create the rule.') };
  }
  revalidatePath('/finance/charges/[id]', 'page');
  return { ok: true, data: (data ?? {}) as { id: string } };
}

/** Deactivate a member rule — future periods stop matching it. */
export async function removeRule(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('charges/delete-exception', {
    body: { id },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not remove the rule.') };
  }
  revalidatePath('/finance/charges/[id]', 'page');
  return { ok: true };
}

interface ForgiveObligationInput {
  readonly obligationId: string;
  readonly reason: string;
}

/** Waive a single obligation (status → forgiven). Sensitive tier. */
export async function forgiveObligation(input: ForgiveObligationInput): Promise<ActionResult> {
  const supabase = await getServerClient();

  const { error } = await supabase.functions.invoke('charges/forgive-obligation', {
    body: { obligationId: input.obligationId, reason: input.reason },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not forgive obligation.'),
    };
  }

  revalidatePath('/finance/charges/[id]', 'page');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}
