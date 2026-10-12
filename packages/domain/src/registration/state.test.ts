import { describe, expect, it } from 'vitest';

import { formatRegistrationState, REGISTRATION_STATES, resolveRegistrationState } from './state';

const empty = {
  fee_required: true,
  marked_paid_at: null,
  waived_at: null,
  paid_on_behalf_at: null,
};

describe('resolveRegistrationState', () => {
  it('returns not_required when fee_required is false', () => {
    expect(resolveRegistrationState({ ...empty, fee_required: false })).toBe('not_required');
  });

  it('returns paid when marked_paid_at is set', () => {
    expect(resolveRegistrationState({ ...empty, marked_paid_at: '2026-06-15T00:00:00Z' })).toBe(
      'paid',
    );
  });

  it('returns waived when waived_at is set', () => {
    expect(resolveRegistrationState({ ...empty, waived_at: '2026-06-20T00:00:00Z' })).toBe(
      'waived',
    );
  });

  it('returns paid_on_behalf when paid_on_behalf_at is set', () => {
    expect(resolveRegistrationState({ ...empty, paid_on_behalf_at: '2026-06-25T00:00:00Z' })).toBe(
      'paid_on_behalf',
    );
  });

  it('returns pending when fee_required with no terminal state set', () => {
    expect(resolveRegistrationState(empty)).toBe('pending');
  });

  it('prefers paid over other terminals if multiple are inconsistent (defensive)', () => {
    expect(
      resolveRegistrationState({
        ...empty,
        marked_paid_at: '2026-06-15T00:00:00Z',
        waived_at: '2026-06-20T00:00:00Z',
      }),
    ).toBe('paid');
  });
});

describe('formatRegistrationState', () => {
  it('has a distinct label for every state', () => {
    const labels = REGISTRATION_STATES.map(formatRegistrationState);
    expect(new Set(labels).size).toBe(REGISTRATION_STATES.length);
  });

  it.each([
    ['not_required', 'Not required'],
    ['pending', 'Pending'],
    ['paid', 'Paid'],
    ['paid_on_behalf', 'Paid on behalf'],
    ['waived', 'Waived'],
  ] as const)('formats %s as %s', (state, label) => {
    expect(formatRegistrationState(state)).toBe(label);
  });
});
