'use server';

import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import type { PaymentOption } from './data';

/**
 * Web-form → RPC method mapping. The public form's friendly labels
 * (MTN MoMo, Orange Money, etc.) collapse to the enum values the
 * finance schema uses.
 */
const PAYMENT_METHOD_MAP: Record<PaymentOption, string> = {
  'mtn-momo': 'mtn_momo',
  'orange-money': 'orange_money',
  card: 'card',
  'bank-transfer': 'bank_transfer',
  'cash-on-site': 'cash',
};

export const ATTIRE_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type AttireSize = (typeof ATTIRE_SIZES)[number];

export interface AttireOrderInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly size: AttireSize;
  readonly quantity: number;
  readonly paymentOption: PaymentOption;
}

export type AttireOrderResult =
  | { readonly ok: true; readonly receiptToken: string }
  | { readonly ok: false; readonly message: string };

/**
 * Record an AGM 2026 attire purchase. Resolves the Attire charge by
 * name inside the AGM 2026 group so the seeded UUID never has to
 * leak into the client bundle. The size lands in
 * `payments.metadata.size` (short string) so the receipt renders
 * "Size: L" without a separate measurements block.
 */
export async function orderAttire(input: AttireOrderInput): Promise<AttireOrderResult> {
  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return { ok: false, message: 'Please enter your full name.' };
  }
  if (!ATTIRE_SIZES.includes(input.size)) {
    return { ok: false, message: 'Pick a size.' };
  }
  const quantity = Math.max(1, Math.floor(input.quantity));
  if (!Number.isFinite(quantity)) {
    return { ok: false, message: 'Quantity must be a positive whole number.' };
  }

  const supabase = await getServerClient();

  const { data: chargeRow } = await supabase
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, groups:groups!inner(slug)')
    .eq('name', 'Attire')
    .eq('shape', 'ticketed')
    .eq('status', 'active')
    .eq('groups.slug', 'agm-2026')
    .maybeSingle();
  const charge = chargeRow as { id: string } | null;
  if (!charge) {
    return { ok: false, message: 'AGM 2026 attire orders are not open yet.' };
  }

  const { data, error } = await supabase.rpc(
    'record_public_ticket_purchase' as never,
    {
      p_charge_id: charge.id,
      p_quantity: quantity,
      p_method: PAYMENT_METHOD_MAP[input.paymentOption],
      p_payer_name: fullName,
      p_payer_email: input.email.trim() || null,
      p_payer_phone: input.phone.trim() || null,
      p_payer_location: null,
      p_metadata: { size: input.size },
    } as never,
  );
  if (error) {
    return { ok: false, message: error.message };
  }
  const rows = data as Array<{ receipt_token: string }> | null;
  const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!first?.receipt_token) {
    return { ok: false, message: 'Order recorded but no receipt was issued.' };
  }
  return { ok: true, receiptToken: first.receipt_token };
}

/**
 * Form-action variant for the plain `<form action={…}>` submission.
 * Redirects to the receipt page on success.
 */
export async function orderAttireForm(formData: FormData): Promise<void> {
  const res = await orderAttire({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    size: String(formData.get('size') ?? 'M') as AttireSize,
    quantity: Number.parseInt(String(formData.get('quantity') ?? '1'), 10) || 1,
    paymentOption: String(formData.get('paymentOption') ?? 'cash-on-site') as PaymentOption,
  });
  if (res.ok) {
    redirect(`/agm-2026/receipt/${res.receiptToken}`);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}
