'use server';

import { redirect } from 'next/navigation';

import { submitAgmRegistration, type AgmRegistrationResult } from '@/lib/agm-registration';

import {
  AGM_ATTIRE_UNIT_PRICE_XAF,
  ATTIRE_SIZES,
  PAYMENT_OPTIONS,
  type AttireSize,
  type PaymentOption,
} from './data';

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
 * Same shape as ticket registration — captured in
 * `cms.agm_registrations`, nothing written to finance. Price is applied
 * server-side from the shared constant.
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

  return submitAgmRegistration({
    kind: 'attire',
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    quantity,
    attireSize: input.size,
    amountXaf: AGM_ATTIRE_UNIT_PRICE_XAF * quantity,
    paymentMethod: input.paymentOption,
  });
}

/** Form-action variant for plain `<form action={…}>` submissions. */
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
