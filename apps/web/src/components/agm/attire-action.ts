'use server';

import { redirect } from 'next/navigation';

import { handOffToFapshi } from '@/lib/fapshi-checkout';
import { getServerClient } from '@/lib/supabase-server';

import { ATTIRE_SIZES, type AttireSize, type PaymentOption } from './data';

const PAYMENT_METHOD_MAP: Record<PaymentOption, string> = {
  'mtn-momo': 'mtn_momo',
  'orange-money': 'orange_money',
  card: 'card',
  'bank-transfer': 'bank_transfer',
  'cash-on-site': 'cash',
};

const FAPSHI_METHODS: ReadonlySet<PaymentOption> = new Set<PaymentOption>([
  'mtn-momo',
  'orange-money',
  'card',
  'bank-transfer',
]);

export interface AttireOrderInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly size: AttireSize;
  readonly quantity: number;
  readonly paymentOption: PaymentOption;
}

export type AttireOrderResult =
  | { readonly ok: true; readonly redirectTo: string }
  | { readonly ok: false; readonly message: string };

/**
 * Record (or start collecting) an AGM 2026 attire order. Same two-path
 * shape as ticket registration: cash → direct RPC; everything else →
 * Fapshi intent + hosted checkout. The chosen size lands in
 * `payments.metadata.size` at finalize time.
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

  const method = PAYMENT_METHOD_MAP[input.paymentOption];
  const email = input.email.trim() || null;
  const phone = input.phone.trim() || null;

  if (FAPSHI_METHODS.has(input.paymentOption)) {
    const { data: intentData, error: intentErr } = await supabase.schema('finance' as never).rpc(
      'initiate_public_ticket_intent' as never,
      {
        p_charge_id: charge.id,
        p_quantity: quantity,
        p_method: method,
        p_payer_name: fullName,
        p_payer_email: email,
        p_payer_phone: phone,
        p_payer_location: null,
        p_metadata: { size: input.size },
      } as never,
    );
    if (intentErr) {
      return { ok: false, message: intentErr.message };
    }
    const rows = intentData as Array<{
      intent_id: string;
      amount: number;
      currency: string;
    }> | null;
    const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!first) {
      return { ok: false, message: 'Could not create a payment intent.' };
    }
    try {
      const { hostedLink } = await handOffToFapshi({
        intentId: first.intent_id,
        amount: Number(first.amount),
        currency: first.currency,
        payerEmail: email,
        payerName: fullName,
        displayMessage: `AGM 2026 Attire (${input.size}) × ${quantity}`,
      });
      return { ok: true, redirectTo: hostedLink };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to reach the payment gateway.',
      };
    }
  }

  const { data, error } = await supabase.schema('finance' as never).rpc(
    'record_public_ticket_purchase' as never,
    {
      p_charge_id: charge.id,
      p_quantity: quantity,
      p_method: method,
      p_payer_name: fullName,
      p_payer_email: email,
      p_payer_phone: phone,
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
  return { ok: true, redirectTo: `/agm-2026/receipt/${first.receipt_token}` };
}

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
    redirect(res.redirectTo);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}
