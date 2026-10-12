import { describe, expect, it } from 'vitest';

import { chargeInputSchema, validateChargeInput, type ChargeInput } from './charges';

// A minimal valid "charge" shape input we can spread into per-test overrides.
const validCharge: ChargeInput = {
  scopeId: '00000000-0000-0000-0000-000000000001',
  shape: 'charge',
  name: 'Monthly dues',
  currency: 'XAF',
  baseAmount: 25000,
  recurrence: 'monthly',
  recurrenceInterval: 1,
  targetFilter: {},
  activationDate: '2027-01-01T00:00:00Z',
};

// A minimal valid "goal" contribution.
const validGoal: ChargeInput = {
  scopeId: '00000000-0000-0000-0000-000000000001',
  shape: 'goal',
  name: '2012 batch project fund',
  currency: 'XAF',
  goalAmount: 210000,
  recurrence: 'one_time',
  recurrenceInterval: 1,
  targetFilter: {},
  lifecycle: 'draft',
  openDate: '2027-01-01T00:00:00Z',
  closeDate: '2027-03-01T00:00:00Z',
};

describe('chargeInputSchema (Zod)', () => {
  it('accepts a well-formed charge payload', () => {
    expect(chargeInputSchema.safeParse(validCharge).success).toBe(true);
  });

  it('rejects lowercase currency', () => {
    const result = chargeInputSchema.safeParse({ ...validCharge, currency: 'xaf' });
    expect(result.success).toBe(false);
  });

  it('rejects negative baseAmount', () => {
    const result = chargeInputSchema.safeParse({ ...validCharge, baseAmount: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    const result = chargeInputSchema.safeParse({ ...validCharge, extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

describe('validateChargeInput — shape rules', () => {
  it('accepts a valid charge', () => {
    expect(validateChargeInput(validCharge)).toEqual({ ok: true });
  });

  it('accepts a valid goal contribution', () => {
    expect(validateChargeInput(validGoal)).toEqual({ ok: true });
  });

  it('rejects a charge shape without an activationDate', () => {
    const result = validateChargeInput({ ...validCharge, activationDate: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'activationDate')).toBe(true);
    }
  });

  it('rejects a charge shape without a positive baseAmount', () => {
    const result = validateChargeInput({ ...validCharge, baseAmount: undefined });
    expect(result.ok).toBe(false);
  });

  it('rejects goalAmount on a non-goal shape', () => {
    const result = validateChargeInput({ ...validCharge, goalAmount: 1000 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'goalAmount')).toBe(true);
    }
  });

  it('rejects a goal shape without a positive goalAmount', () => {
    const result = validateChargeInput({ ...validGoal, goalAmount: undefined });
    expect(result.ok).toBe(false);
  });

  it('rejects capacity on a non-ticketed shape', () => {
    const result = validateChargeInput({ ...validGoal, capacity: 200 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'capacity')).toBe(true);
    }
  });

  it('rejects a contribution shape without a lifecycle', () => {
    const result = validateChargeInput({ ...validGoal, lifecycle: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'lifecycle')).toBe(true);
    }
  });

  it('rejects a charge shape carrying a lifecycle', () => {
    const result = validateChargeInput({ ...validCharge, lifecycle: 'draft' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'lifecycle')).toBe(true);
    }
  });

  it('rejects a contribution shape without open/close dates', () => {
    const result = validateChargeInput({ ...validGoal, closeDate: undefined });
    expect(result.ok).toBe(false);
  });

  it('rejects closeDate earlier than openDate', () => {
    const result = validateChargeInput({
      ...validGoal,
      openDate: '2027-03-01T00:00:00Z',
      closeDate: '2027-02-01T00:00:00Z',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'closeDate')).toBe(true);
    }
  });

  it('rejects recurring on a non-obligation shape (goal/open/ticketed/donation)', () => {
    const result = validateChargeInput({ ...validGoal, recurrence: 'monthly' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'recurrence')).toBe(true);
    }
  });

  it('rejects baseAmount on a goal shape', () => {
    const result = validateChargeInput({ ...validGoal, baseAmount: 5000 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'baseAmount')).toBe(true);
    }
  });
});
