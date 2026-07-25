'use server';

import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { tierForAmount, type AgmFundingTier, type PaymentOption } from './data';

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

/**
 * Per-tier funding-campaign names. Each tier is seeded as its own
 * donation-shape charge inside the AGM 2026 group; the donation flows
 * to the matching campaign so Finance can tell tiers apart in reports.
 * When the tier is unset the flow lands on the default AGM 2026
 * campaign instead.
 */
const TIER_CAMPAIGN_NAME: Record<AgmFundingTier['key'], string> = {
  bronze: 'Bronze Funding',
  silver: 'Silver Funding',
  gold: 'Gold Funding',
  platinum: 'Platinum Funding',
};

export interface FundingInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly tier: AgmFundingTier['key'] | null;
  readonly amountXaf: number;
  readonly paymentOption: PaymentOption;
  readonly note?: string;
}

export type FundingResult =
  | { readonly ok: true; readonly receiptToken: string }
  | { readonly ok: false; readonly message: string };

/**
 * Record an AGM 2026 funding donation. The tier is a function of
 * the amount (Bronze <= 50k, Silver <= 250k, Gold <= 1M, Platinum
 * above that). We re-derive the tier server-side from the amount to
 * ignore whatever the client sent, so a tampered form can't route
 * a small gift into the Platinum campaign. `record_public_donation`
 * writes the payment and receipt verification atomically.
 */
export async function donateForAgmFunding(input: FundingInput): Promise<FundingResult> {
  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return { ok: false, message: 'Please enter your name.' };
  }
  if (!Number.isFinite(input.amountXaf) || input.amountXaf <= 0) {
    return { ok: false, message: 'Enter a positive amount.' };
  }

  const supabase = await getServerClient();

  const resolvedTier: AgmFundingTier['key'] = tierForAmount(input.amountXaf);
  const campaignName = TIER_CAMPAIGN_NAME[resolvedTier];
  const { data: chargeRow } = await supabase
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, currency, groups:groups!inner(slug)')
    .eq('name', campaignName)
    .eq('shape', 'donation')
    .eq('status', 'active')
    .eq('groups.slug', 'agm-2026')
    .maybeSingle();
  const charge = chargeRow as { id: string; currency: string } | null;
  if (!charge) {
    return { ok: false, message: 'AGM 2026 funding is not open yet.' };
  }

  const noteBase = input.note?.trim() || '';
  const tierNote = `[${resolvedTier.toUpperCase()}] `;
  const combinedNote = `${tierNote}${noteBase}`.slice(0, 500).trim() || null;

  const { data, error } = await supabase.schema('finance' as never).rpc(
    'record_public_donation' as never,
    {
      p_charge_id: charge.id,
      p_amount: input.amountXaf,
      p_currency: charge.currency,
      p_method: PAYMENT_METHOD_MAP[input.paymentOption],
      p_donor_name: fullName,
      p_donor_email: input.email.trim() || null,
      p_note: combinedNote,
    } as never,
  );
  if (error) {
    return { ok: false, message: error.message };
  }
  const rows = data as Array<{ receipt_token: string }> | null;
  const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!first?.receipt_token) {
    return { ok: false, message: 'Donation recorded but no receipt was issued.' };
  }
  return { ok: true, receiptToken: first.receipt_token };
}

/**
 * Form-action variant for the plain `<form action={…}>` submission.
 */
export async function donateForAgmFundingForm(formData: FormData): Promise<void> {
  const tierRaw = String(formData.get('tier') ?? '');
  const validTiers: readonly AgmFundingTier['key'][] = ['bronze', 'silver', 'gold', 'platinum'];
  const tier = validTiers.includes(tierRaw as AgmFundingTier['key'])
    ? (tierRaw as AgmFundingTier['key'])
    : null;
  const res = await donateForAgmFunding({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    tier,
    amountXaf: Number.parseInt(String(formData.get('amountXaf') ?? '0'), 10) || 0,
    paymentOption: String(formData.get('paymentOption') ?? 'cash-on-site') as PaymentOption,
    note: String(formData.get('note') ?? ''),
  });
  if (res.ok) {
    redirect(`/agm-2026/receipt/${res.receiptToken}`);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}
