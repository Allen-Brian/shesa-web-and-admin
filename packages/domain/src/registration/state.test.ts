import { describe, expect, it } from 'vitest';

import { resolveRegistrationState } from './state';

describe('resolveRegistrationState', () => {
  it('returns not_required when fee_required is false', () => {
    expect(
      resolveRegistrationState({
        fee_required: false,
        marked_paid_at: null,
        waived_at: null,
      }),
    ).toBe('not_required');
  });

  it('returns waived when waived_at is set (regardless of paid)', () => {
    expect(
      resolveRegistrationState({
        fee_required: true,
        marked_paid_at: null,
        waived_at: '2026-07-01T00:00:00Z',
      }),
    ).toBe('waived');
  });

  it('returns paid when marked_paid_at is set', () => {
    expect(
      resolveRegistrationState({
        fee_required: true,
        marked_paid_at: '2026-06-15T00:00:00Z',
        waived_at: null,
      }),
    ).toBe('paid');
  });

  it('returns unpaid otherwise', () => {
    expect(
      resolveRegistrationState({
        fee_required: true,
        marked_paid_at: null,
        waived_at: null,
      }),
    ).toBe('unpaid');
  });

  it('never returns not_required if fee_required=true, even with no timestamps', () => {
    expect(
      resolveRegistrationState({
        fee_required: true,
        marked_paid_at: null,
        waived_at: null,
      }),
    ).not.toBe('not_required');
  });
});
