/**
 * Row shape for the sandbox payments table.
 *
 * These rows come from `finance.sandbox_payments`, which is deliberately
 * not part of the books: no ledger entry, no treasury movement, no
 * receipt, and no dashboard or report reads it. Everything here is a
 * record of a *test* transaction against the Tranzak sandbox.
 *
 * Gross, fee and net are kept apart on purpose. The payer is charged the
 * gross; the gateway's fee comes off before the merchant account sees it.
 * A run that reconciles at gross but nets less than expected is exactly
 * the thing you want to catch in testing, and it is only visible if the
 * three numbers are shown separately.
 */

export interface SandboxPaymentRow {
  readonly id: string;
  readonly intentId: string;
  readonly chargeName: string;
  readonly scopeName: string;

  /** What we asked the gateway for. */
  readonly amount: number;
  readonly currency: string;
  readonly method: string;

  readonly payerLabel: string;
  readonly payerEmail: string | null;
  readonly payerPhone: string | null;

  /** What the gateway reported. */
  readonly provider: string;
  readonly providerRef: string | null;
  readonly providerTransactionId: string | null;
  readonly providerStatus: string | null;
  readonly gatewayAmount: number | null;
  readonly gatewayCurrency: string | null;
  readonly gatewayFee: number | null;
  readonly gatewayNetAmount: number | null;

  /** True when the gateway's gross and currency match what we asked for. */
  readonly reconciles: boolean;

  readonly rawPayload: Record<string, unknown> | null;
  readonly createdAt: string;
}

export type SerialSandboxPaymentRow = SandboxPaymentRow & { readonly serial: number };
