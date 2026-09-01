/**
 * Shared "hand off to Fapshi" flow used by the three AGM 2026 server
 * actions (register / attire / funding). Given an intent that already
 * exists in finance.payment_intents (created by an initiate_public_*_intent
 * RPC), this:
 *
 *   1. Calls Fapshi Initiate Pay with our amount + return URL + intent_id
 *      as the externalId so we can correlate the eventual webhook.
 *   2. Persists the returned transId + hosted link back onto the intent
 *      via attach_fapshi_ref (idempotent).
 *   3. Returns the hosted-checkout URL so the caller can redirect.
 *
 * The FAPSHI_RETURN_URL_BASE env var is the base URL for the pending
 * page (e.g. https://shesaconnect.com/agm-2026). We append the intent_id
 * so the pending page knows which intent to poll.
 */

import { clientEnv } from '@shesa/config/env.client';
import { serverEnv } from '@shesa/config/env.server';

import { getServerClient } from './supabase-server';
import { initiatePay } from './fapshi';

export interface HandoffInput {
  readonly intentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly payerEmail: string | null;
  readonly payerName: string | null;
  readonly displayMessage: string;
}

export interface HandoffResult {
  readonly hostedLink: string;
  readonly transId: string;
}

function returnUrlBase(): string {
  const base = serverEnv.FAPSHI_RETURN_URL_BASE ?? clientEnv.NEXT_PUBLIC_WEB_APP_URL;
  if (!base) {
    throw new Error(
      'Missing FAPSHI_RETURN_URL_BASE (or NEXT_PUBLIC_WEB_APP_URL fallback) — Fapshi needs a public HTTPS return URL.',
    );
  }
  return base.replace(/\/$/, '');
}

/**
 * Currency-aware amount conversion. Fapshi expects an integer number
 * of the smallest unit for XAF (which has no subunit), so we round.
 * Non-XAF currencies aren't supported today; guard on that at the RPC
 * layer as well (see initiate_public_*_intent).
 */
function toFapshiAmount(amount: number, currency: string): number {
  if (currency !== 'XAF') {
    throw new Error(`Fapshi handoff currently only supports XAF, got ${currency}`);
  }
  return Math.round(amount);
}

export async function handOffToFapshi(input: HandoffInput): Promise<HandoffResult> {
  const supabase = await getServerClient();

  const redirectUrl = `${returnUrlBase()}/agm-2026/pending/${input.intentId}`;

  const fapshi = await initiatePay({
    amount: toFapshiAmount(input.amount, input.currency),
    email: input.payerEmail,
    redirectUrl,
    externalId: input.intentId,
    userId: input.intentId,
    message: input.displayMessage,
  });

  const { error } = await supabase.schema('finance' as never).rpc(
    'attach_fapshi_ref' as never,
    {
      p_intent_id: input.intentId,
      p_provider_ref: fapshi.transId,
      p_hosted_link: fapshi.link,
    } as never,
  );
  if (error) {
    // The intent exists but we can't persist the transId. Fapshi has
    // already returned a hosted link the payer could conceivably use,
    // but without our ref we can't reconcile it — surface as an error
    // and let the caller show the user a friendly retry.
    throw new Error(`Failed to attach Fapshi ref: ${error.message}`);
  }

  return { hostedLink: fapshi.link, transId: fapshi.transId };
}
