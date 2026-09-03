/**
 * Settlement — turning "Tranzak says this was paid" into a row.
 *
 * ─── Where the authority comes from ────────────────────────────────────
 * Not from the caller. This module is reached by a webhook that anyone can
 * POST to and by a page the payer's own browser lands on, so neither
 * caller is trusted for anything beyond an identifier. The authority is
 * `GET /xp021/v1/request/details`, read with our own bearer token, and
 * every decision below is made from that response.
 *
 * That is why the entry points take an id and nothing else. A forged
 * webhook can, at worst, make us re-read a transaction that is already
 * ours and reach the same conclusion we would have reached anyway.
 *
 * ─── What it refuses to do ─────────────────────────────────────────────
 *   · Settle anything the gateway has not marked SUCCESSFUL.
 *   · Settle when the amount or currency disagrees with the intent —
 *     `finalize_fapshi_intent` wrote our expected amount without ever
 *     comparing (SEC-16). A mismatch marks the intent failed and shouts.
 *   · Settle twice. The unique index on (provider, provider_ref) is the
 *     backstop, and a terminal intent short-circuits before that.
 *   · Cross the mode boundary. A sandbox intent settles into
 *     finance.sandbox_payments and a live one into finance.payments; the
 *     database refuses the other combinations regardless of this code.
 */

import { fetchRequestDetails, reconcile, type TranzakRequest } from './tranzak-client.ts';
import { resolveTranzakConfig } from './tranzak-config.ts';
import { createServiceRoleClient } from './supabase-client.ts';

export type SettleOutcome =
  | 'settled'
  | 'already-settled'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'mismatch'
  | 'unknown-intent';

export interface SettleResult {
  readonly outcome: SettleOutcome;
  readonly intentId?: string;
  readonly mode?: 'sandbox' | 'live';
  /** The settlement row, in whichever table its mode dictates. */
  readonly settlementId?: string;
  /** Verification token for the receipt page. Live settlements only. */
  readonly receiptToken?: string;
  readonly gatewayStatus?: string;
  readonly reason?: string;
}

interface IntentRow {
  readonly id: string;
  readonly obligation_id: string | null;
  readonly charge_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly status: string;
  readonly mode: 'sandbox' | 'live';
  readonly resulting_payment_id: string | null;
  readonly sandbox_payment_id: string | null;
  readonly payer_name: string | null;
  readonly payer_email: string | null;
  readonly payer_phone: string | null;
  readonly metadata: Record<string, unknown> | null;
}

const INTENT_COLUMNS =
  'id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, ' +
  'status, mode, resulting_payment_id, sandbox_payment_id, payer_name, payer_email, ' +
  'payer_phone, metadata';

function log(level: 'info' | 'warn' | 'error', message: string, extra: Record<string, unknown>) {
  console[level === 'info' ? 'log' : level](
    JSON.stringify({ level, component: 'tranzak.settle', message, ...extra }),
  );
}

/**
 * Map a gateway status onto the intent lifecycle.
 *
 * Anything not listed is a state the payer can still move out of, so the
 * intent stays pending rather than being closed early.
 */
function intentStatusFor(gatewayStatus: string): 'succeeded' | 'failed' | 'cancelled' | null {
  switch (gatewayStatus) {
    case 'SUCCESSFUL':
      return 'succeeded';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
    case 'CANCELLED_BY_PAYER':
      return 'cancelled';
    default:
      return null;
  }
}

/* ══════════════════════════════════════════════════════════════════════
 * Entry points
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Settle from a gateway request id — the webhook's path.
 *
 * `mchTransactionRef` on the gateway's own response carries our intent id,
 * so the link back is established by the authenticated read rather than by
 * anything the caller supplied.
 */
export async function settleFromRequestId(requestId: string): Promise<SettleResult> {
  const config = resolveTranzakConfig();
  const details = await fetchRequestDetails(requestId, config);

  const intentId = details.mchTransactionRef;
  if (!intentId) {
    log('warn', 'gateway request carries no mchTransactionRef', { requestId });
    return { outcome: 'unknown-intent', gatewayStatus: details.status };
  }
  return await settleIntent(intentId, details);
}

/**
 * Settle from our own intent id — the payer-return path.
 *
 * The payer coming back from Tranzak is a better signal than waiting for a
 * webhook, so the return page settles synchronously instead of polling.
 * The webhook remains the backstop for a payer who closes the tab.
 */
export async function settleFromIntentId(intentId: string): Promise<SettleResult> {
  const service = createServiceRoleClient();
  const { data } = await service
    .schema('finance' as never)
    .from('payment_intents' as never)
    .select(INTENT_COLUMNS)
    .eq('id', intentId)
    .maybeSingle();

  const intent = data as IntentRow | null;
  if (!intent) return { outcome: 'unknown-intent' };

  const already = terminalResult(intent);
  if (already) return already;

  const requestId = (intent.metadata ?? {})['provider_ref'];
  if (typeof requestId !== 'string' || requestId.length === 0) {
    log('warn', 'intent has no gateway reference to poll', { intentId });
    return { outcome: 'pending', intentId, mode: intent.mode };
  }

  const config = resolveTranzakConfig();
  const details = await fetchRequestDetails(requestId, config);
  return await settleIntent(intentId, details, intent);
}

/* ══════════════════════════════════════════════════════════════════════
 * The settlement itself
 * ══════════════════════════════════════════════════════════════════════ */

/** An intent that has already reached a terminal state answers from itself. */
function terminalResult(intent: IntentRow): SettleResult | null {
  if (intent.status === 'succeeded') {
    return {
      outcome: 'already-settled',
      intentId: intent.id,
      mode: intent.mode,
      settlementId: intent.resulting_payment_id ?? intent.sandbox_payment_id ?? undefined,
    };
  }
  if (intent.status === 'failed' || intent.status === 'cancelled') {
    return { outcome: intent.status, intentId: intent.id, mode: intent.mode };
  }
  return null;
}

async function settleIntent(
  intentId: string,
  details: TranzakRequest,
  preloaded?: IntentRow,
): Promise<SettleResult> {
  const service = createServiceRoleClient();

  let intent = preloaded ?? null;
  if (!intent) {
    const { data } = await service
      .schema('finance' as never)
      .from('payment_intents' as never)
      .select(INTENT_COLUMNS)
      .eq('id', intentId)
      .maybeSingle();
    intent = data as IntentRow | null;
  }

  if (!intent) {
    // The gateway knows a reference we do not. Loud, because it means
    // either a forged webhook or a transaction created outside this system.
    log('warn', 'gateway reference does not match any intent', {
      intentId,
      requestId: details.requestId,
    });
    return { outcome: 'unknown-intent', gatewayStatus: details.status };
  }

  const already = terminalResult(intent);
  if (already) return already;

  const mapped = intentStatusFor(details.status);

  if (mapped === null) {
    return {
      outcome: 'pending',
      intentId: intent.id,
      mode: intent.mode,
      gatewayStatus: details.status,
    };
  }

  if (mapped !== 'succeeded') {
    await service
      .schema('finance' as never)
      .from('payment_intents' as never)
      .update({
        status: mapped,
        failure_reason: `gateway reported ${details.status}`,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', intent.id);
    return {
      outcome: mapped,
      intentId: intent.id,
      mode: intent.mode,
      gatewayStatus: details.status,
    };
  }

  // Gateway says paid. Does it agree with what we asked for?
  const agreement = reconcile({ amount: intent.amount, currency: intent.currency }, details);
  if (!agreement.ok) {
    log('error', 'gateway settled an amount we did not ask for', {
      intentId: intent.id,
      requestId: details.requestId,
      reason: agreement.reason,
    });
    await service
      .schema('finance' as never)
      .from('payment_intents' as never)
      .update({
        status: 'failed',
        failure_reason: agreement.reason,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', intent.id);
    return {
      outcome: 'mismatch',
      intentId: intent.id,
      mode: intent.mode,
      reason: agreement.reason,
    };
  }

  return intent.mode === 'sandbox'
    ? await settleSandbox(intent, details)
    : await settleLive(intent, details);
}

async function settleSandbox(intent: IntentRow, details: TranzakRequest): Promise<SettleResult> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .schema('finance' as never)
    .from('sandbox_payments' as never)
    .insert({
      intent_id: intent.id,
      scope_id: intent.scope_id,
      charge_id: intent.charge_id,
      obligation_id: intent.obligation_id,
      amount: intent.amount,
      currency: intent.currency,
      method: intent.method,
      payer_member_id: intent.payer_member_id,
      payer_name: intent.payer_name,
      payer_email: intent.payer_email,
      payer_phone: intent.payer_phone,
      provider: 'tranzak',
      provider_ref: details.requestId,
      provider_transaction_id: details.transactionId ?? null,
      provider_status: details.status,
      gateway_amount: details.amount,
      gateway_currency: details.currencyCode,
      gateway_fee: details.merchant?.fee ?? null,
      gateway_net_amount: details.merchant?.netAmountReceived ?? null,
      raw_payload: details as unknown as Record<string, unknown>,
    } as never)
    .select('id')
    .maybeSingle();

  // 23505 — this gateway reference already settled. A replayed webhook,
  // or the payer's return racing the notification. Adopt the existing row.
  if (error?.code === '23505') {
    const { data: existing } = await service
      .schema('finance' as never)
      .from('sandbox_payments' as never)
      .select('id')
      .eq('provider', 'tranzak')
      .eq('provider_ref', details.requestId)
      .maybeSingle();
    return {
      outcome: 'already-settled',
      intentId: intent.id,
      mode: 'sandbox',
      settlementId: (existing as { id: string } | null)?.id,
    };
  }

  if (error || !data) {
    log('error', 'sandbox settlement insert failed', {
      intentId: intent.id,
      code: error?.code,
      error: error?.message,
    });
    throw new Error(`sandbox settlement failed: ${error?.message ?? 'no row returned'}`);
  }

  const settlementId = (data as { id: string }).id;

  await service
    .schema('finance' as never)
    .from('payment_intents' as never)
    .update({
      status: 'succeeded',
      sandbox_payment_id: settlementId,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', intent.id);

  log('info', 'sandbox settlement recorded', {
    intentId: intent.id,
    settlementId,
    requestId: details.requestId,
  });

  return { outcome: 'settled', intentId: intent.id, mode: 'sandbox', settlementId };
}

async function settleLive(intent: IntentRow, details: TranzakRequest): Promise<SettleResult> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .schema('finance' as never)
    .from('payments' as never)
    .insert({
      obligation_id: intent.obligation_id,
      charge_id: intent.charge_id,
      scope_id: intent.scope_id,
      payer_member_id: intent.payer_member_id,
      amount: intent.amount,
      currency: intent.currency,
      method: intent.method,
      source: 'auto',
      // No recorded_by: nobody keyed this in. The gateway did it, and the
      // provenance lives in external_ref and metadata.
      external_ref: details.requestId,
      metadata: {
        intent_id: intent.id,
        provider: 'tranzak',
        provider_ref: details.requestId,
        provider_transaction_id: details.transactionId ?? null,
        gateway_status: details.status,
        gateway_amount: details.amount,
        gateway_currency: details.currencyCode,
        gateway_fee: details.merchant?.fee ?? null,
        gateway_net_amount: details.merchant?.netAmountReceived ?? null,
      },
    } as never)
    .select('id')
    .maybeSingle();

  // 23505 — payments_gateway_reference_key. This gateway transaction has
  // already been settled, so the notification is a replay or the payer's
  // return raced it. Adopt the existing payment rather than writing a
  // second one; a duplicate here is immutable and reaches the ledger.
  if (error?.code === '23505') {
    const { data: existing } = await service
      .schema('finance' as never)
      .from('payments' as never)
      .select('id')
      .eq('external_ref', details.requestId)
      .maybeSingle();
    const existingId = (existing as { id: string } | null)?.id;
    const { data: token } = existingId
      ? await service
          .schema('finance' as never)
          .from('receipt_verifications' as never)
          .select('token')
          .eq('payment_id', existingId)
          .maybeSingle()
      : { data: null };
    return {
      outcome: 'already-settled',
      intentId: intent.id,
      mode: 'live',
      settlementId: existingId,
      receiptToken: (token as { token: string } | null)?.token,
    };
  }

  if (error || !data) {
    log('error', 'live settlement insert failed', {
      intentId: intent.id,
      code: error?.code,
      error: error?.message,
    });
    throw new Error(`live settlement failed: ${error?.message ?? 'no row returned'}`);
  }

  const paymentId = (data as { id: string }).id;

  await service
    .schema('finance' as never)
    .from('payment_intents' as never)
    .update({
      status: 'succeeded',
      resulting_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', intent.id);

  // The receipt token is minted by the payments_generate_receipt trigger,
  // so it exists by the time this read runs.
  const { data: verification } = await service
    .schema('finance' as never)
    .from('receipt_verifications' as never)
    .select('token')
    .eq('payment_id', paymentId)
    .maybeSingle();

  log('info', 'live settlement recorded', {
    intentId: intent.id,
    paymentId,
    requestId: details.requestId,
  });

  return {
    outcome: 'settled',
    intentId: intent.id,
    mode: 'live',
    settlementId: paymentId,
    receiptToken: (verification as { token: string } | null)?.token,
  };
}
