'use server';

import { redirect } from 'next/navigation';

import { submitAgmRegistration, type AgmRegistrationResult } from '@/lib/agm-registration';

import { AGM_TICKET_UNIT_PRICE_XAF, PAYMENT_OPTIONS, type PaymentOption } from './agm-content';

export interface RegisterInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly quantity: number;
  readonly paymentOption: PaymentOption;
}

export type RegisterResult = AgmRegistrationResult;

const VALID_OPTIONS: ReadonlySet<string> = new Set(PAYMENT_OPTIONS.map((o) => o.value));

/**
 * Record an AGM 2026 ticket registration.
 *
 * No money moves here. Until Tranzak is integrated the submission is
 * captured in `cms.agm_registrations` and nothing else — Finance settles
 * it out-of-band. See `@/lib/agm-registration` for why the finance-side
 * RPCs this used to call were removed.
 *
 * The ticket price is applied server-side from the same constant the
 * form renders, so a tampered client cannot choose its own total.
 */
export async function registerForAgm(input: RegisterInput): Promise<RegisterResult> {
  const quantity = Math.floor(input.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, message: 'Quantity must be at least 1.' };
  }
  if (quantity > 20) {
    return { ok: false, message: 'For more than 20 tickets, please contact the secretariat.' };
  }
  if (!VALID_OPTIONS.has(input.paymentOption)) {
    return { ok: false, message: 'Pick a payment option.' };
  }

  return submitAgmRegistration({
    kind: 'ticket',
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    quantity,
    amountXaf: AGM_TICKET_UNIT_PRICE_XAF * quantity,
    paymentMethod: input.paymentOption,
  });
}

/** Form-action variant for plain `<form action={…}>` submissions. */
export async function registerForAgmForm(formData: FormData): Promise<void> {
  const res = await registerForAgm({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    quantity: Number.parseInt(String(formData.get('quantity') ?? '1'), 10) || 1,
    paymentOption: String(formData.get('paymentOption') ?? 'cash-on-site') as PaymentOption,
  });
  if (res.ok) {
    redirect(res.redirectTo);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}
