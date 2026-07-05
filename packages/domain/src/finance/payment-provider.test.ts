import { describe, expect, it } from 'vitest';

import { SimulatedProvider } from './payment-provider';

describe('SimulatedProvider', () => {
  const intent = {
    scopeId: '00000000-0000-0000-0000-000000000001',
    obligationId: '00000000-0000-0000-0000-000000000010',
    chargeId: null,
    payerMemberId: '00000000-0000-0000-0000-000000000020',
    amount: 25000,
    currency: 'XAF',
    method: 'mtn_momo' as const,
  };

  it('initiate returns a stable intent id and echoed prefill', async () => {
    const provider = new SimulatedProvider({ delayMs: 0, refPrefix: 'test' });
    const window = await provider.initiate(intent);
    expect(window.intentId).toMatch(/^test_/);
    expect(window.prefill.amount).toBe(25000);
    expect(window.prefill.currency).toBe('XAF');
    expect(window.prefill.method).toBe('mtn_momo');
    expect(window.prefill.displayMessage).toContain('mtn_momo');
  });

  it('confirm resolves success by default', async () => {
    const provider = new SimulatedProvider({ delayMs: 0 });
    const { intentId } = await provider.initiate(intent);
    const result = await provider.confirm(intentId);
    expect(result.outcome).toBe('success');
    expect(result.externalRef).toContain(intentId);
  });

  it('confirm honors forceOutcome=failed', async () => {
    const provider = new SimulatedProvider({ delayMs: 0, forceOutcome: 'failed' });
    const { intentId } = await provider.initiate(intent);
    const result = await provider.confirm(intentId);
    expect(result.outcome).toBe('failed');
    expect(result.failureReason).toBeTruthy();
  });

  it('confirm honors forceOutcome=pending', async () => {
    const provider = new SimulatedProvider({ delayMs: 0, forceOutcome: 'pending' });
    const { intentId } = await provider.initiate(intent);
    const result = await provider.confirm(intentId);
    expect(result.outcome).toBe('pending');
  });

  it('confirm fails cleanly for an unknown intent', async () => {
    const provider = new SimulatedProvider({ delayMs: 0 });
    const result = await provider.confirm('does_not_exist');
    expect(result.outcome).toBe('failed');
    expect(result.failureReason).toContain('Unknown intent');
  });

  it('exposes name=simulated so callers can distinguish the seam', () => {
    expect(new SimulatedProvider().name).toBe('simulated');
  });
});
