'use server';

import { redirect } from 'next/navigation';

import { handOffToFapshi } from '@/lib/fapshi-checkout';
import { getServerClient } from '@/lib/supabase-server';

import { tierForAmount, type AgmFundingTier, type PaymentOption } from './data';

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

/**
 * Per-tier funding-campaign names. Each tier is seeded as its own
 * donation-shape charge inside the AGM 2026 group; the donation flows
 * to the matching campaign so Finance can tell tiers apart in reports.
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
  | { readonly ok: true; readonly redirectTo: string }
  | { readonly ok: false; readonly message: string };

/**
 * Record (or start collecting) an AGM 2026 funding donation. Tier is
 * re-derived server-side from the amount to defeat form tampering. Two
 * paths mirroring register/attire: cash → direct RPC; else → Fapshi
 * intent + hosted checkout.
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
  const method = PAYMENT_METHOD_MAP[input.paymentOption];
  const email = input.email.trim() || null;
  const phone = input.phone.trim() || null;

  if (FAPSHI_METHODS.has(input.paymentOption)) {
    const { data: intentData, error: intentErr } = await supabase.schema('finance' as never).rpc(
      'initiate_public_donation_intent' as never,
      {
        p_charge_id: charge.id,
        p_amount: input.amountXaf,
        p_currency: charge.currency,
        p_method: method,
        p_donor_name: fullName,
        p_donor_email: email,
        p_donor_phone: phone,
        p_note: combinedNote,
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
      return { ok: false, message: 'Could not create a donation intent.' };
    }
    try {
      const { hostedLink } = await handOffToFapshi({
        intentId: first.intent_id,
        amount: Number(first.amount),
        currency: first.currency,
        payerEmail: email,
        payerName: fullName,
        displayMessage: `AGM 2026 ${resolvedTier} donation`,
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
    'record_public_donation' as never,
    {
      p_charge_id: charge.id,
      p_amount: input.amountXaf,
      p_currency: charge.currency,
      p_method: method,
      p_donor_name: fullName,
      p_donor_email: email,
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
  return { ok: true, redirectTo: `/agm-2026/receipt/${first.receipt_token}` };
}

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
    redirect(res.redirectTo);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}
