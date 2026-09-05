'use server';

import { redirect } from 'next/navigation';

import { AGM_CHARGE_IDS, openAgmCheckout } from '@/lib/agm-checkout';
import { submitAgmRegistration, type AgmRegistrationResult } from '@/lib/agm-registration';

import { AGM_TICKET_UNIT_PRICE_XAF, PAYMENT_OPTIONS, type PaymentOption } from './agm-content';

export interface RegisterInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  /** The registrant's leaving batch, e.g. "1998". */
  readonly batch: string;
  readonly quantity: number;
  readonly paymentOption: PaymentOption;
}

export type RegisterResult = AgmRegistrationResult;

const VALID_OPTIONS: ReadonlySet<string> = new Set(PAYMENT_OPTIONS.map((o) => o.value));

/**
 * Record an AGM 2026 ticket registration.
 *
 * The registration is recorded first and unconditionally, then — unless
 * the visitor chose to pay on arrival — a Tranzak checkout is opened and
 * they are redirected to it.
 *
 * The price the payer is actually charged comes from
 * `finance.charges.base_amount`, read inside `payments/initiate-public`.
 * The constant used here only sizes the registration record and the
 * figure the form displays. A tampered client can choose neither.
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

  const batch = input.batch.trim().slice(0, 60);
  if (!batch) {
    return { ok: false, message: 'Please tell us your batch.' };
  }

  const recorded = await submitAgmRegistration({
    kind: 'ticket',
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    quantity,
    amountXaf: AGM_TICKET_UNIT_PRICE_XAF * quantity,
    paymentMethod: input.paymentOption,
    // Recorded in the note, which is the only free-text the registration
    // RPC takes. A dedicated column would be better for reporting on
    // batch turnout, but that needs a migration.
    note: batch ? `Batch: ${batch}` : undefined,
  });
  if (!recorded.ok) return recorded;

  const checkout = await openAgmCheckout({
    chargeId: AGM_CHARGE_IDS.ticket,
    quantity,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    paymentMethod: input.paymentOption,
    reference: recorded.reference,
    description: `SHESA AGM 2026 — ${quantity} ticket${quantity === 1 ? '' : 's'}`,
  });

  // A checkout we could not open is not a failed registration: the record
  // stands, and the payer is told so on the confirmation page.
  if (!checkout.ok) return recorded;

  return { ...recorded, redirectTo: checkout.checkoutUrl };
}

/** Form-action variant for plain `<form action={…}>` submissions. */
export async function registerForAgmForm(formData: FormData): Promise<void> {
  const res = await registerForAgm({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    batch: String(formData.get('batch') ?? ''),
    quantity: Number.parseInt(String(formData.get('quantity') ?? '1'), 10) || 1,
    paymentOption: String(formData.get('paymentOption') ?? 'pay-now') as PaymentOption,
  });
  if (res.ok) {
    redirect(res.redirectTo);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}
