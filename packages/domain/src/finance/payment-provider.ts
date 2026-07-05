/**
 * PaymentProvider — the seam between the finance engine and the payment
 * rails. Locked spec decision #16 (docs/product/finance.md):
 *
 *   > Real MTN MoMo / Orange Money / card / bank / webhooks /
 *   > reconciliation are DEFERRED. Payments are simulated (~3-second
 *   > confirmation) behind this interface. The real providers slot in
 *   > behind the same interface later with no change to the finance
 *   > engine.
 *
 * Every payment recorded by the engine goes through
 *   provider.initiate(intent)  → returns { intentId, prefill }
 *   provider.confirm(intentId) → returns { outcome, externalRef, at }
 *
 * The `SimulatedProvider` below is the M1 implementation. It resolves
 * `confirm()` after a configurable delay (default 3000ms; tests pass 10ms)
 * with a stable synthetic externalRef. When M4 wires real providers,
 * this stays in place for local dev + testing.
 */

import type { PaymentMethod } from './enums';

// ─── Types ─────────────────────────────────────────────────────────────

export interface PaymentIntent {
  /** Where the money is going (treasury scope). Not the payer's home scope. */
  readonly scopeId: string;
  readonly obligationId: string | null;
  readonly chargeId: string | null;
  readonly payerMemberId: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly method: PaymentMethod;
  readonly memo?: string;
}

export interface InitiatedPaymentWindow {
  /**
   * Provider's handle for the intent — the token the frontend polls /
   * the confirm hook receives. Stable per intent for as long as the
   * provider considers it live.
   */
  readonly intentId: string;
  /**
   * Prefilled fields the payment window shows the user. In the
   * simulator these are echoed back for the confirmation banner; with
   * real providers they may include a redirect URL or a USSD code.
   */
  readonly prefill: {
    readonly amount: number;
    readonly currency: string;
    readonly method: PaymentMethod;
    readonly displayMessage: string;
  };
}

export interface ConfirmedPayment {
  readonly outcome: 'success' | 'failed' | 'pending';
  readonly externalRef: string;
  readonly at: Date;
  readonly failureReason?: string;
}

export interface PaymentProvider {
  readonly name: string;
  /**
   * Register the intent with the provider. Real providers make an HTTP
   * call here; the simulator returns synchronously with a synthetic id.
   */
  initiate(intent: PaymentIntent): Promise<InitiatedPaymentWindow>;
  /**
   * Poll or await confirmation. The engine treats `success` as final
   * (writes a payment row); `failed` surfaces to the user; `pending`
   * means "check again later" — the engine keeps the intent open.
   */
  confirm(intentId: string): Promise<ConfirmedPayment>;
}

// ─── Simulated provider ────────────────────────────────────────────────

export interface SimulatedProviderOptions {
  /** Delay before confirm() resolves. Spec calls for ~3s; tests use 10ms. */
  readonly delayMs?: number;
  /** Fixed outcome override — useful for testing failure paths. */
  readonly forceOutcome?: 'success' | 'failed' | 'pending';
  /** Deterministic externalRef seed for tests. */
  readonly refPrefix?: string;
}

/**
 * The simulated provider. Records the intent in an internal map, then
 * resolves confirm() after `delayMs` with a synthetic externalRef.
 * Deliberately in-memory — this instance lives for the lifetime of the
 * process; a page reload loses the intent. That matches production
 * behavior where the real provider is authoritative.
 *
 * Not exported as a singleton — each Edge Function invocation
 * constructs its own instance so tests can inject the fast variant.
 */
export class SimulatedProvider implements PaymentProvider {
  readonly name = 'simulated';
  private readonly delayMs: number;
  private readonly forceOutcome: 'success' | 'failed' | 'pending' | null;
  private readonly refPrefix: string;
  private readonly intents = new Map<string, PaymentIntent>();

  constructor(opts: SimulatedProviderOptions = {}) {
    this.delayMs = opts.delayMs ?? 3000;
    this.forceOutcome = opts.forceOutcome ?? null;
    this.refPrefix = opts.refPrefix ?? 'sim';
  }

  async initiate(intent: PaymentIntent): Promise<InitiatedPaymentWindow> {
    const intentId = `${this.refPrefix}_${cryptoRandom()}`;
    this.intents.set(intentId, intent);
    return {
      intentId,
      prefill: {
        amount: intent.amount,
        currency: intent.currency,
        method: intent.method,
        displayMessage: `Simulated ${intent.method} · ${intent.amount} ${intent.currency}`,
      },
    };
  }

  async confirm(intentId: string): Promise<ConfirmedPayment> {
    const intent = this.intents.get(intentId);
    if (!intent) {
      return {
        outcome: 'failed',
        externalRef: `${this.refPrefix}_missing_${intentId}`,
        at: new Date(),
        failureReason: `Unknown intent ${intentId}`,
      };
    }
    await sleep(this.delayMs);
    const outcome = this.forceOutcome ?? 'success';
    if (outcome === 'failed') {
      return {
        outcome: 'failed',
        externalRef: `${this.refPrefix}_fail_${intentId}`,
        at: new Date(),
        failureReason: 'Simulated failure (forceOutcome)',
      };
    }
    if (outcome === 'pending') {
      return {
        outcome: 'pending',
        externalRef: `${this.refPrefix}_pending_${intentId}`,
        at: new Date(),
      };
    }
    return {
      outcome: 'success',
      externalRef: `${this.refPrefix}_ok_${intentId}`,
      at: new Date(),
    };
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cryptoRandom(): string {
  // Deno + Node both expose globalThis.crypto.randomUUID in current LTS.
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // Fallback — never reachable in the runtimes we target, but keeps
  // this file zero-dep so it can be imported anywhere.
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
