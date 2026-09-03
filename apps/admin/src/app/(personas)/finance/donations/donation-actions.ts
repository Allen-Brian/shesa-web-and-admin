'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Actions for the Donations page.
 *
 * Donations share the /charges/* + /payments/* edge functions:
 *   * A donation campaign is a charge with shape='donation'.
 *   * A walk-in donation is a payment/record-manual against that charge.
 *   * A public donation lands via the finance.record_public_donation()
 *     RPC from the anonymous website — nothing to do here for it, but
 *     the audit trail + receipt token surface in this page's donations
 *     feed.
 */

export type ActionResult<T = unknown> =
  { ok: true; data?: T; message?: string } | { ok: false; message: string };

export type PaymentMethod = 'mtn_momo' | 'orange_money' | 'cash' | 'bank_transfer' | 'card';

interface CreateCampaignInput {
  readonly scopeId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly currency: string;
  readonly openDate: string;
  readonly closeDate: string;
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();

  const { data, error } = await supabase.functions.invoke('charges/create', {
    body: {
      scopeId: input.scopeId,
      shape: 'donation',
      name: input.name,
      description: input.description ?? null,
      currency: input.currency,
      recurrence: 'one_time',
      recurrenceInterval: 1,
      lifecycle: 'draft',
      openDate: input.openDate,
      closeDate: input.closeDate,
    },
  });

  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not create campaign.') };
  }

  revalidatePath('/finance/donations');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}

export async function approveCampaign(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('charges/approve', { body: { id } });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not approve campaign.') };
  }
  revalidatePath('/finance/donations');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}

export async function closeCampaign(id: string, reason?: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('charges/close', {
    body: { id, reason },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not close campaign.') };
  }
  revalidatePath('/finance/donations');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}

export async function extendCampaign(
  id: string,
  newCloseDate: string,
  reason?: string,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('charges/extend', {
    body: { id, newCloseDate, reason },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not extend campaign.') };
  }
  revalidatePath('/finance/donations');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}

export async function archiveCampaign(id: string, reason?: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('charges/archive', {
    body: { id, reason },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not archive campaign.') };
  }
  revalidatePath('/finance/donations');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}

interface RecordWalkInInput {
  readonly chargeId: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: PaymentMethod;
  readonly donorName?: string;
  readonly donorEmail?: string;
  readonly memo?: string;
}

export async function recordWalkInDonation(
  input: RecordWalkInInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();

  // Donor name/email land in payment metadata so they render in the
  // donations feed alongside the public entries.
  const memoBits = [input.memo?.trim(), input.donorName ? `From: ${input.donorName}` : null]
    .filter(Boolean)
    .join(' · ');

  const { data, error } = await supabase.functions.invoke('payments/record-manual', {
    body: {
      chargeId: input.chargeId,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      memo: memoBits || undefined,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not record donation.'),
    };
  }

  revalidatePath('/finance/donations');
  revalidatePath('/finance', 'layout');
  return { ok: true, data: (data ?? {}) as { id: string } };
}

export async function reverseDonation(
  originalPaymentId: string,
  reason: string,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('payments/reverse', {
    body: { originalPaymentId, reason },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not reverse donation.') };
  }
  revalidatePath('/finance/donations');
  revalidatePath('/finance', 'layout');
  return { ok: true };
}
