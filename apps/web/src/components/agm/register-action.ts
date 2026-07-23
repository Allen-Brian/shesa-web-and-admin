'use server';

import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import type { PaymentOption } from './data';

/**
 * Public.tsx signal: web forms drive `finance.record_public_ticket_purchase`
 * for the AGM ticket. Payment methods on this page are labels for the
 * downstream MoMo/Orange/bank rail — the RPC records `'auto'` source
 * so Finance can reconcile against the eventual bank statement.
 */
const PAYMENT_METHOD_MAP: Record<PaymentOption, string> = {
  'mtn-momo': 'mtn_momo',
  'orange-money': 'orange_money',
  card: 'card',
  'bank-transfer': 'bank_transfer',
  'cash-on-site': 'cash',
};

export interface RegisterInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly quantity: number;
  readonly paymentOption: PaymentOption;
}

export type RegisterResult =
  | { readonly ok: true; readonly receiptToken: string }
  | { readonly ok: false; readonly message: string };

/**
 * Record an AGM 2026 ticket purchase. Resolves the ticket charge by
 * looking up the "Ticket" charge inside the AGM 2026 event group so
 * the seeded UUID doesn't have to leak into the client bundle. The
 * `record_public_ticket_purchase` RPC (M1 hardening) writes the
 * payment, ticket row, and receipt verification atomically.
 */
export async function registerForAgm(input: RegisterInput): Promise<RegisterResult> {
  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return { ok: false, message: 'Please enter your full name.' };
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
    .eq('name', 'Ticket')
    .eq('shape', 'ticketed')
    .eq('status', 'active')
    .eq('groups.slug', 'agm-2026')
    .maybeSingle();
  const charge = chargeRow as { id: string } | null;
  if (!charge) {
    return { ok: false, message: 'AGM 2026 ticket sales are not open yet.' };
  }

  const { data, error } = await supabase.schema('finance' as never).rpc(
    'record_public_ticket_purchase' as never,
    {
      p_charge_id: charge.id,
      p_quantity: quantity,
      p_method: PAYMENT_METHOD_MAP[input.paymentOption],
      p_payer_name: fullName,
      p_payer_email: input.email.trim() || null,
      p_payer_phone: input.phone.trim() || null,
      p_payer_location: null,
      p_metadata: {},
    } as never,
  );
  if (error) {
    return { ok: false, message: error.message };
  }
  const rows = data as Array<{ receipt_token: string }> | null;
  const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!first?.receipt_token) {
    return { ok: false, message: 'Ticket recorded but no receipt was issued.' };
  }
  return { ok: true, receiptToken: first.receipt_token };
}

/**
 * Form-action variant used by the plain `<form action={…}>`
 * submission. Extracts fields from FormData and redirects to the
 * receipt page on success.
 */
export async function registerForAgmForm(formData: FormData): Promise<void> {
  const res = await registerForAgm({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    quantity: Number.parseInt(String(formData.get('quantity') ?? '1'), 10) || 1,
    paymentOption: String(formData.get('paymentOption') ?? 'cash-on-site') as PaymentOption,
  });
  if (res.ok) {
    redirect(`/agm-2026/receipt/${res.receiptToken}`);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}
