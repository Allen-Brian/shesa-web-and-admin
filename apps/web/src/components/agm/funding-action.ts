'use server';

import { redirect } from 'next/navigation';

import { AGM_CHARGE_IDS, openAgmCheckout } from '@/lib/agm-checkout';
import { submitAgmRegistration, type AgmRegistrationResult } from '@/lib/agm-registration';

import {
  PAYMENT_OPTIONS,
  tierForAmount,
  type AgmFundingTier,
  type PaymentOption,
} from './agm-content';

export interface FundingInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly tier: AgmFundingTier['key'] | null;
  readonly amountXaf: number;
  readonly paymentOption: PaymentOption;
  readonly note?: string;
}

export type FundingResult = AgmRegistrationResult;

const VALID_OPTIONS: ReadonlySet<string> = new Set(PAYMENT_OPTIONS.map((o) => o.value));

/** Upper bound on a single pledge. Anything larger goes through the secretariat. */
const MAX_PLEDGE_XAF = 50_000_000;

/**
 * Record an AGM 2026 funding pledge.
 *
 * The tier is re-derived server-side from the amount so a tampered form
 * cannot claim Platinum recognition for a Bronze contribution — the
 * client-supplied `tier` is ignored entirely.
 *
 * As with tickets and attire, this writes only to
 * `cms.agm_registrations`; no donation is recorded in finance until an
 * operator confirms the money arrived.
 */
export async function donateForAgmFunding(input: FundingInput): Promise<FundingResult> {
  if (!Number.isFinite(input.amountXaf) || input.amountXaf <= 0) {
    return { ok: false, message: 'Enter a positive amount.' };
  }
  if (input.amountXaf > MAX_PLEDGE_XAF) {
    return {
      ok: false,
      message: 'For pledges above 50,000,000 XAF, please contact the secretariat directly.',
    };
  }
  if (!VALID_OPTIONS.has(input.paymentOption)) {
    return { ok: false, message: 'Pick a payment option.' };
  }

  const resolvedTier = tierForAmount(input.amountXaf);
  const note = `[${resolvedTier.toUpperCase()}] ${input.note?.trim() ?? ''}`.slice(0, 500).trim();

  const recorded = await submitAgmRegistration({
    kind: 'donation',
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    amountXaf: input.amountXaf,
    paymentMethod: input.paymentOption,
    note,
  });
  if (!recorded.ok) return recorded;

  // A donation is genuinely caller-priced, so the amount does travel —
  // bounded above by MAX_PLEDGE_XAF here and again in the Edge Function.
  // The tier only decides which campaign the gift is filed under.
  const checkout = await openAgmCheckout({
    chargeId: AGM_CHARGE_IDS[resolvedTier] ?? AGM_CHARGE_IDS.general,
    amountXaf: input.amountXaf,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    paymentMethod: input.paymentOption,
    reference: recorded.reference,
    description: `SHESA AGM 2026 — ${resolvedTier} funding`,
  });
  if (!checkout.ok) return recorded;

  return { ...recorded, redirectTo: checkout.checkoutUrl };
}

/** Form-action variant for plain `<form action={…}>` submissions. */
export async function donateForAgmFundingForm(formData: FormData): Promise<void> {
  const res = await donateForAgmFunding({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    // Ignored — the tier is derived from the amount server-side.
    tier: null,
    amountXaf: Number.parseInt(String(formData.get('amountXaf') ?? '0'), 10) || 0,
    paymentOption: String(formData.get('paymentOption') ?? 'pay-now') as PaymentOption,
    note: String(formData.get('note') ?? ''),
  });
  if (res.ok) {
    redirect(res.redirectTo);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}
