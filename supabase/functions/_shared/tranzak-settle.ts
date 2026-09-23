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
  /** Human name for what was paid for, and where to send the payer back. */
  readonly chargeName?: string | null;
  readonly subjectName?: string | null;
  readonly backHref?: string | null;
}

interface IntentRow {
  readonly id: string;
  readonly obligation_id: string | null;
  readonly charge_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly method: string | null;
  readonly status: string;
  readonly mode: 'sandbox' | 'live';
  readonly resulting_payment_id: string | null;
  readonly sandbox_payment_id: string | null;
  readonly payer_name: string | null;
  readonly payer_email: string | null;
  readonly payer_phone: string | null;
  readonly payer_location: string | null;
  readonly quantity: number | null;
  readonly note: string | null;
  readonly metadata: Record<string, unknown> | null;
}

const INTENT_COLUMNS =
  'id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, ' +
  'status, mode, resulting_payment_id, sandbox_payment_id, payer_name, payer_email, ' +
  'payer_phone, payer_location, quantity, note, metadata';

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
 * What the payment was for, and what it was paid with
 * ══════════════════════════════════════════════════════════════════════ */

/**
 * Tranzak names methods for people ("MTN Momo"), we store an enum. This
 * maps the gateway's answer onto ours.
 *
 * The gateway's answer is the truthful one: the payer chooses again on
 * Tranzak's page and can pick something other than what they told our
 * form. Returns null when it is a method our enum has no name for, in
 * which case the intent's own method stands and the gateway's raw string
 * is kept in metadata either way.
 */
function methodFromGateway(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes('mtn')) return 'mtn_momo';
  if (s.includes('orange')) return 'orange_money';
  if (s.includes('card') || s.includes('visa') || s.includes('master')) return 'card';
  if (s.includes('bank') || s.includes('transfer')) return 'bank_transfer';
  if (s.includes('cash')) return 'cash';
  return null;
}

/**
 * The method to record on a settlement.
 *
 * The gateway's answer wins, then whatever the intent knew, then `card`
 * as the last resort — `finance.payments.method` is NOT NULL and a
 * settlement that reached this point is real money that must be recorded
 * whatever we call it. The fallback is logged, because it means Tranzak
 * named a method `methodFromGateway` does not recognise and the mapping
 * needs a case adding.
 */
function settledMethod(intent: IntentRow, details: TranzakRequest): string {
  const fromGateway = methodFromGateway(details.payer?.paymentMethod);
  if (fromGateway) return fromGateway;
  if (intent.method) return intent.method;
  log('warn', 'could not name the payment method; defaulting', {
    intentId: intent.id,
    gatewayMethod: details.payer?.paymentMethod ?? null,
  });
  return 'card';
}

interface PaymentReason {
  readonly charge_name: string | null;
  readonly charge_shape: string | null;
  readonly group_name: string | null;
  readonly event_id: string | null;
  readonly event_name: string | null;
  /**
   * Where on the public site this payment came from, derived here rather
   * than accepted from the caller. The return page needs somewhere to
   * send the payer back to, and a caller-supplied URL would be an open
   * redirect on a page that anyone can reach.
   */
  readonly public_href: string | null;
}

/**
 * Resolve what a payment was for, denormalised onto the record.
 *
 * Denormalised on purpose. A payment is immutable and outlives the thing
 * that occasioned it: a charge can be renamed, an event deleted, a group
 * archived. A row that says only `charge_id` becomes unreadable the day
 * that charge goes away, and a finance record nobody can explain is
 * worse than no record.
 */
async function resolveReason(chargeId: string | null): Promise<PaymentReason> {
  const empty: PaymentReason = {
    charge_name: null,
    charge_shape: null,
    group_name: null,
    event_id: null,
    event_name: null,
    public_href: null,
  };
  if (!chargeId) return empty;

  const service = createServiceRoleClient();

  const { data: chargeRaw } = await service
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, name, shape, group_id')
    .eq('id', chargeId)
    .maybeSingle();

  const charge = chargeRaw as {
    id: string;
    name: string;
    shape: string;
    group_id: string | null;
  } | null;
  if (!charge) return empty;

  const [{ data: groupRaw }, { data: eventRaw }, { data: projectRaw }, { data: siteEventRaw }] =
    await Promise.all([
      charge.group_id
        ? service
            .schema('finance' as never)
            .from('groups' as never)
            .select('name, slug')
            .eq('id', charge.group_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      service
        .schema('exco' as never)
        .from('events' as never)
        .select('id, name')
        .eq('contribution_charge_id', chargeId)
        .maybeSingle(),
      service
        .schema('cms' as never)
        .from('projects' as never)
        .select('slug, title')
        .eq('contribution_charge_id', chargeId)
        .maybeSingle(),
      service
        .schema('cms' as never)
        .from('site_events' as never)
        .select('slug, title')
        .eq('contribution_charge_id', chargeId)
        .maybeSingle(),
    ]);

  const group = groupRaw as { name: string; slug: string } | null;
  const event = eventRaw as { id: string; name: string } | null;
  const project = projectRaw as { slug: string; title: string } | null;
  const siteEvent = siteEventRaw as { slug: string; title: string } | null;

  return {
    charge_name: charge.name,
    charge_shape: charge.shape,
    group_name: group?.name ?? null,
    event_id: event?.id ?? null,
    // The public entity's own title is the better name for a receipt than
    // the charge's, which tends to be an accounting label.
    event_name: siteEvent?.title ?? event?.name ?? project?.title ?? null,
    public_href: project
      ? `/projects/${project.slug}`
      : siteEvent
        ? `/events/${siteEvent.slug}`
        : group?.slug === 'agm-2026'
          ? '/agm-2026'
          : null,
  };
}

/**
 * The metadata every settlement carries: who paid, what for, and what the
 * gateway said.
 *
 * The first half of that used to be missing entirely. A live settlement
 * wrote gateway keys and nothing else, while the Transactions page reads
 * `payer_name`, `payer_email`, `payer_phone`, `payer_location` and `note`
 * — so every gateway payment displayed as "Anonymous" with no contact
 * details and no reason. The sandbox path carried them in real columns,
 * which made test data richer than production.
 */
async function settlementMetadata(
  intent: IntentRow,
  details: TranzakRequest,
): Promise<Record<string, unknown>> {
  const reason = await resolveReason(intent.charge_id);
  const meta = (intent.metadata ?? {}) as Record<string, unknown>;

  return {
    intent_id: intent.id,

    // ── From the form ──
    payer_name: intent.payer_name,
    payer_email: intent.payer_email,
    payer_phone: intent.payer_phone,
    payer_location: intent.payer_location,
    quantity: intent.quantity,
    note: intent.note,
    source: meta.source ?? null,
    agm_reference: meta.agm_reference ?? null,
    /** Attire orders only; null on every other charge. */
    attire_size: meta.attire_size ?? null,

    // ── What it was for ──
    ...reason,

    // ── From the gateway ──
    provider: 'tranzak',
    provider_ref: details.requestId,
    provider_transaction_id: details.transactionId ?? null,
    gateway_status: details.status,
    gateway_amount: details.amount,
    gateway_currency: details.currencyCode,
    gateway_fee: details.merchant?.fee ?? null,
    gateway_net_amount: details.merchant?.netAmountReceived ?? null,
    gateway_method: details.payer?.paymentMethod ?? null,
    gateway_payer_account: details.payer?.accountId ?? null,
    /** What the payer told our form, kept for comparison. */
    requested_method: intent.method,
  };
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

  const already = await terminalResult(intent);
  if (already) return already;

  const requestId = (intent.metadata ?? {})['provider_ref'];
  if (typeof requestId !== 'string' || requestId.length === 0) {
    // Still `initiated`: the gateway was never successfully called, so
    // there is no reference to ask about. Nothing to settle and nobody
    // waiting on a payer.
    log('warn', 'intent has no gateway reference to poll', { intentId });
    return { outcome: 'pending', intentId, mode: intent.mode, ...(await contextFor(intent)) };
  }

  const config = resolveTranzakConfig();
  const details = await fetchRequestDetails(requestId, config);
  return await settleIntent(intentId, details, intent);
}

/* ══════════════════════════════════════════════════════════════════════
 * The settlement itself
 * ══════════════════════════════════════════════════════════════════════ */

/** An intent that has already reached a terminal state answers from itself. */
async function terminalResult(intent: IntentRow): Promise<SettleResult | null> {
  if (intent.status === 'succeeded') {
    // A live settlement's receipt token is looked up rather than assumed:
    // the payer may be returning long after the webhook already settled,
    // and without it they land on a page with nowhere to go.
    let receiptToken: string | undefined;
    if (intent.mode === 'live' && intent.resulting_payment_id) {
      const { data } = await createServiceRoleClient()
        .schema('finance' as never)
        .from('receipt_verifications' as never)
        .select('token')
        .eq('payment_id', intent.resulting_payment_id)
        .maybeSingle();
      receiptToken = (data as { token: string } | null)?.token;
    }
    return {
      outcome: 'already-settled',
      intentId: intent.id,
      mode: intent.mode,
      settlementId: intent.resulting_payment_id ?? intent.sandbox_payment_id ?? undefined,
      receiptToken,
      ...(await contextFor(intent)),
    };
  }
  if (intent.status === 'failed' || intent.status === 'cancelled') {
    return {
      outcome: intent.status,
      intentId: intent.id,
      mode: intent.mode,
      ...(await contextFor(intent)),
    };
  }
  return null;
}

/** The context a return page needs, whatever the outcome turns out to be. */
async function contextFor(
  intent: IntentRow,
): Promise<Pick<SettleResult, 'chargeName' | 'subjectName' | 'backHref'>> {
  const reason = await resolveReason(intent.charge_id);
  return {
    chargeName: reason.charge_name,
    subjectName: reason.event_name ?? reason.group_name,
    backHref: reason.public_href,
  };
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

  const already = await terminalResult(intent);
  if (already) return already;

  const mapped = intentStatusFor(details.status);

  if (mapped === null) {
    return {
      outcome: 'pending',
      intentId: intent.id,
      mode: intent.mode,
      gatewayStatus: details.status,
      ...(await contextFor(intent)),
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
      ...(await contextFor(intent)),
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
      ...(await contextFor(intent)),
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
      method: settledMethod(intent, details),
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
      // The same envelope the live path writes, so a sandbox run shows
      // exactly what production will. `raw_payload` keeps the gateway's
      // reply verbatim alongside it for debugging.
      raw_payload: {
        ...(await settlementMetadata(intent, details)),
        gateway_response: details as unknown as Record<string, unknown>,
      },
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

  return {
    outcome: 'settled',
    intentId: intent.id,
    mode: 'sandbox',
    settlementId,
    ...(await contextFor(intent)),
  };
}

async function settleLive(intent: IntentRow, details: TranzakRequest): Promise<SettleResult> {
  const service = createServiceRoleClient();

  const metadata = await settlementMetadata(intent, details);

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
      // What the payer actually used, not what they told our form.
      method: settledMethod(intent, details),
      source: 'auto',
      // No recorded_by: nobody keyed this in. The gateway did it, and the
      // provenance lives in external_ref and metadata.
      external_ref: details.requestId,
      metadata,
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
    ...(await contextFor(intent)),
  };
}
