import { describe, expect, it } from 'vitest';

import { resolveInitialRegistration } from './initial-registration';

describe('resolveInitialRegistration', () => {
  it('returns not_required with null amount/currency when no fee is active', () => {
    expect(
      resolveInitialRegistration({
        registrationFeeRequired: false,
        registrationFeeAmount: null,
        registrationFeeCurrency: null,
      }),
    ).toEqual({
      fee_required: false,
      registration_state: 'not_required',
      amount: null,
      currency_code: null,
    });
  });

  it('ignores a lingering amount when fee is not required', () => {
    // A branch might have an amount set from a previous fee window but
    // fee_required is currently false — the initial state stays
    // not_required, not "pending with amount." The rule keys off
    // fee_required only.
    expect(
      resolveInitialRegistration({
        registrationFeeRequired: false,
        registrationFeeAmount: 10000,
        registrationFeeCurrency: 'XAF',
      }),
    ).toEqual({
      fee_required: false,
      registration_state: 'not_required',
      amount: null,
      currency_code: null,
    });
  });

  it('returns pending + snapshots amount + currency when fee is active', () => {
    expect(
      resolveInitialRegistration({
        registrationFeeRequired: true,
        registrationFeeAmount: 25000,
        registrationFeeCurrency: 'XAF',
      }),
    ).toEqual({
      fee_required: true,
      registration_state: 'pending',
      amount: 25000,
      currency_code: 'XAF',
    });
  });

  it('preserves the amount snapshot as a stable historical fact', () => {
    // If a fee changes later, the member's obligation stays what it
    // was at join time. The helper returns the current fee amount, and
    // the caller writes it onto the registration_status row.
    const first = resolveInitialRegistration({
      registrationFeeRequired: true,
      registrationFeeAmount: 10000,
      registrationFeeCurrency: 'XAF',
    });
    const later = resolveInitialRegistration({
      registrationFeeRequired: true,
      registrationFeeAmount: 15000,
      registrationFeeCurrency: 'XAF',
    });
    expect(first.amount).toBe(10000);
    expect(later.amount).toBe(15000);
  });
});
