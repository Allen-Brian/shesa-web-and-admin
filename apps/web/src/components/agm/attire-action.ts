'use server';

import { redirect } from 'next/navigation';

import { AGM_CHARGE_IDS, openAgmCheckout } from '@/lib/agm-checkout';
import { submitAgmRegistration, type AgmRegistrationResult } from '@/lib/agm-registration';

import {
  AGM_ATTIRE_UNIT_PRICE_XAF,
  ATTIRE_SIZES,
  PAYMENT_OPTIONS,
  type AttireSize,
  type PaymentOption,
} from './agm-content';

export interface AttireOrderInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly size: AttireSize;
  readonly quantity: number;
  readonly paymentOption: PaymentOption;
}

export type AttireOrderResult = AgmRegistrationResult;

const VALID_OPTIONS: ReadonlySet<string> = new Set(PAYMENT_OPTIONS.map((o) => o.value));

/**
 * Record an AGM 2026 attire order.
 *
 * Same shape as ticket registration: recorded first, then handed to
 * hosted checkout unless the visitor is paying on arrival. The price the
 * payer is charged comes from `finance.charges.base_amount`, not from
 * the constant used here.
 */
export async function orderAttire(input: AttireOrderInput): Promise<AttireOrderResult> {
  if (!ATTIRE_SIZES.includes(input.size)) {
    return { ok: false, message: 'Pick a size.' };
  }
  const quantity = Math.floor(input.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, message: 'Quantity must be at least 1.' };
  }
  if (quantity > 20) {
    return { ok: false, message: 'For more than 20 items, please contact the secretariat.' };
  }
  if (!VALID_OPTIONS.has(input.paymentOption)) {
    return { ok: false, message: 'Pick a payment option.' };
  }

  const recorded = await submitAgmRegistration({
    kind: 'attire',
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    quantity,
    attireSize: input.size,
    amountXaf: AGM_ATTIRE_UNIT_PRICE_XAF * quantity,
    paymentMethod: input.paymentOption,
  });
  if (!recorded.ok) return recorded;

  const checkout = await openAgmCheckout({
    chargeId: AGM_CHARGE_IDS.attire,
    quantity,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    paymentMethod: input.paymentOption,
    reference: recorded.reference,
    // Carried as a field as well as inside the description: the
    // description is copy for the payer's gateway page, and the
    // secretariat needs the size as data they can sort a table by.
    attireSize: input.size,
    description: `SHESA AGM 2026 attire — ${quantity} × size ${input.size}`,
  });
  if (!checkout.ok) return recorded;

  return { ...recorded, redirectTo: checkout.checkoutUrl };
}

/** Form-action variant for plain `<form action={…}>` submissions. */
export async function orderAttireForm(formData: FormData): Promise<void> {
  const res = await orderAttire({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    size: String(formData.get('size') ?? 'M') as AttireSize,
    quantity: Number.parseInt(String(formData.get('quantity') ?? '1'), 10) || 1,
    paymentOption: String(formData.get('paymentOption') ?? 'pay-now') as PaymentOption,
  });
  if (res.ok) {
    redirect(res.redirectTo);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}
