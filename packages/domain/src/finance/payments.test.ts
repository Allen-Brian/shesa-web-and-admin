import { describe, expect, it } from 'vitest';

import {
  payOnBehalfSchema,
  recordManualPaymentSchema,
  resolvePaymentSource,
  reversePaymentSchema,
} from './payments';

const validScopeId = '00000000-0000-0000-0000-000000000001';
const validMemberId = '00000000-0000-0000-0000-000000000010';
const validObligationId = '00000000-0000-0000-0000-000000000020';
const validPaymentId = '00000000-0000-0000-0000-000000000030';

describe('recordManualPaymentSchema', () => {
  it('accepts a payment against an obligation', () => {
    const parsed = recordManualPaymentSchema.safeParse({
      obligationId: validObligationId,
      payerMemberId: validMemberId,
      amount: 25000,
      currency: 'XAF',
      method: 'cash',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a payment against a charge (contribution path)', () => {
    const parsed = recordManualPaymentSchema.safeParse({
      chargeId: validScopeId,
      amount: 10000,
      currency: 'XAF',
      method: 'mtn_momo',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects when neither obligationId nor chargeId is set', () => {
    const parsed = recordManualPaymentSchema.safeParse({
      amount: 25000,
      currency: 'XAF',
      method: 'cash',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects zero and negative amounts', () => {
    expect(
      recordManualPaymentSchema.safeParse({
        obligationId: validObligationId,
        amount: 0,
        currency: 'XAF',
        method: 'cash',
      }).success,
    ).toBe(false);
    expect(
      recordManualPaymentSchema.safeParse({
        obligationId: validObligationId,
        amount: -1,
        currency: 'XAF',
        method: 'cash',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown methods', () => {
    const parsed = recordManualPaymentSchema.safeParse({
      obligationId: validObligationId,
      amount: 25000,
      currency: 'XAF',
      method: 'crypto',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects lowercase currency', () => {
    const parsed = recordManualPaymentSchema.safeParse({
      obligationId: validObligationId,
      amount: 25000,
      currency: 'xaf',
      method: 'cash',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('payOnBehalfSchema', () => {
  it('requires beneficiaryMemberId', () => {
    const withoutBenef = payOnBehalfSchema.safeParse({
      obligationId: validObligationId,
      amount: 25000,
      currency: 'XAF',
      method: 'cash',
    });
    expect(withoutBenef.success).toBe(false);
  });

  it('accepts with beneficiaryMemberId + obligationId', () => {
    const parsed = payOnBehalfSchema.safeParse({
      obligationId: validObligationId,
      beneficiaryMemberId: validMemberId,
      amount: 25000,
      currency: 'XAF',
      method: 'cash',
      note: 'Paid by branch president at meeting',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('reversePaymentSchema', () => {
  it('requires reason', () => {
    const withoutReason = reversePaymentSchema.safeParse({
      originalPaymentId: validPaymentId,
    });
    expect(withoutReason.success).toBe(false);
  });

  it('accepts with originalPaymentId + reason', () => {
    const parsed = reversePaymentSchema.safeParse({
      originalPaymentId: validPaymentId,
      reason: 'Duplicate entry',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty reason', () => {
    const parsed = reversePaymentSchema.safeParse({
      originalPaymentId: validPaymentId,
      reason: '',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('resolvePaymentSource', () => {
  it('maps manual/on_behalf/reverse to manual', () => {
    expect(resolvePaymentSource('manual')).toBe('manual');
    expect(resolvePaymentSource('on_behalf')).toBe('manual');
    expect(resolvePaymentSource('reverse')).toBe('manual');
  });

  it('maps confirmed to auto', () => {
    expect(resolvePaymentSource('confirmed')).toBe('auto');
  });
});
