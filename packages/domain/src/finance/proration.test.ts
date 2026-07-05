import { describe, expect, it } from 'vitest';

import { prorate } from './proration';

const janPeriod = {
  start: new Date('2027-01-01T00:00:00Z'),
  end: new Date('2027-02-01T00:00:00Z'),
};

describe('prorate', () => {
  it('member joined before period.start → full amount', () => {
    const result = prorate(25000, janPeriod, new Date('2026-06-01T00:00:00Z'));
    expect(result).toEqual({ kind: 'full', amount: 25000 });
  });

  it('member joined exactly at period.start → full amount', () => {
    const result = prorate(25000, janPeriod, new Date('2027-01-01T00:00:00Z'));
    expect(result).toEqual({ kind: 'full', amount: 25000 });
  });

  it('member joined at or after period.end → skip', () => {
    const result = prorate(25000, janPeriod, new Date('2027-02-15T00:00:00Z'));
    expect(result).toEqual({ kind: 'skip', reason: 'joined_after_period' });

    const atEnd = prorate(25000, janPeriod, new Date('2027-02-01T00:00:00Z'));
    expect(atEnd).toEqual({ kind: 'skip', reason: 'joined_after_period' });
  });

  it('member joined half-way through January → half amount', () => {
    // January has 31 days. Joining Jan 17 leaves 15 days owed (17,18,...,31).
    const result = prorate(31000, janPeriod, new Date('2027-01-17T00:00:00Z'));
    if (result.kind !== 'prorated') throw new Error('expected prorated');
    expect(result.daysInPeriod).toBe(31);
    expect(result.daysOwed).toBe(15);
    expect(result.amount).toBe(15000);
  });

  it('rounds half-up to 2 decimals', () => {
    // 100 * 1/3 = 33.33333... → 33.33
    const shortPeriod = {
      start: new Date('2027-01-01T00:00:00Z'),
      end: new Date('2027-01-04T00:00:00Z'),
    };
    const result = prorate(100, shortPeriod, new Date('2027-01-03T00:00:00Z'));
    if (result.kind !== 'prorated') throw new Error('expected prorated');
    expect(result.amount).toBe(33.33);
  });

  it('throws on negative baseAmount', () => {
    expect(() => prorate(-1, janPeriod, new Date('2027-01-15T00:00:00Z'))).toThrow(/baseAmount/);
  });

  it('throws on zero-length period', () => {
    const bad = { start: janPeriod.start, end: janPeriod.start };
    expect(() => prorate(100, bad, new Date('2027-01-01T00:00:00Z'))).toThrow(/period.end/);
  });

  it('handles baseAmount=0 with a full outcome (uncommon but legal)', () => {
    const result = prorate(0, janPeriod, new Date('2026-12-01T00:00:00Z'));
    expect(result).toEqual({ kind: 'full', amount: 0 });
  });
});
