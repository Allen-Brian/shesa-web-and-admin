'use server';

import { redirect } from 'next/navigation';

import { submitContribution } from '@/lib/contribution';

/**
 * The Server Action behind every contribute form.
 *
 * One action for projects, events and anything else that grows a charge —
 * the form posts a charge id and the server decides everything that
 * matters from it. Nothing here trusts the client with a price: a ticketed
 * charge is multiplied by `base_amount` inside the Edge Function, and only
 * a donation's amount travels, bounded on both sides.
 *
 * Returns on failure and redirects on success, because `redirect()` throws
 * — a returned error is the only way the form can show one.
 */
export async function contributeAction(
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  const chargeId = String(formData.get('chargeId') ?? '');
  const subject = String(formData.get('subject') ?? 'this');

  if (!chargeId) return { ok: false, message: 'Nothing to contribute to.' };

  const rawQuantity = formData.get('quantity');
  const rawAmount = formData.get('amountXaf');

  const result = await submitContribution({
    chargeId,
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    quantity: rawQuantity == null ? undefined : Number.parseInt(String(rawQuantity), 10) || 1,
    amountXaf: rawAmount == null ? undefined : Number.parseInt(String(rawAmount), 10) || undefined,
    note: String(formData.get('note') ?? '') || undefined,
    description: `SHESA — ${subject}`.slice(0, 200),
  });

  if (!result.ok) return { ok: false, message: result.message };

  redirect(result.checkoutUrl);
}
