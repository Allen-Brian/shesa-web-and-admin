import { describe, expect, it } from 'vitest';

import { computeCurrentPeriod, daysBetween } from './periods';

describe('computeCurrentPeriod', () => {
  it('monthly, interval=1: February 15 → Feb 1 to Mar 1', () => {
    const p = computeCurrentPeriod('monthly', 1, new Date('2027-02-15T00:00:00Z'));
    expect(p.start.toISOString()).toBe('2027-02-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2027-03-01T00:00:00.000Z');
  });

  it('monthly, interval=1: December 31 → Dec 1 to Jan 1 (year rollover)', () => {
    const p = computeCurrentPeriod('monthly', 1, new Date('2027-12-31T23:59:59Z'));
    expect(p.start.toISOString()).toBe('2027-12-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2028-01-01T00:00:00.000Z');
  });

  it('monthly, interval=2: April → March-April period (anchored to Jan)', () => {
    const p = computeCurrentPeriod('monthly', 2, new Date('2027-04-15T00:00:00Z'));
    expect(p.start.toISOString()).toBe('2027-03-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2027-05-01T00:00:00.000Z');
  });

  it('quarterly, interval=1: February → Q1 (Jan-Apr)', () => {
    const p = computeCurrentPeriod('quarterly', 1, new Date('2027-02-15T00:00:00Z'));
    expect(p.start.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2027-04-01T00:00:00.000Z');
  });

  it('quarterly, interval=1: July → Q3 (Jul-Oct)', () => {
    const p = computeCurrentPeriod('quarterly', 1, new Date('2027-07-15T00:00:00Z'));
    expect(p.start.toISOString()).toBe('2027-07-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2027-10-01T00:00:00.000Z');
  });

  it('biannual, interval=1: March → H1 (Jan-Jul)', () => {
    const p = computeCurrentPeriod('biannual', 1, new Date('2027-03-15T00:00:00Z'));
    expect(p.start.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2027-07-01T00:00:00.000Z');
  });

  it('biannual, interval=1: August → H2 (Jul-Jan)', () => {
    const p = computeCurrentPeriod('biannual', 1, new Date('2027-08-15T00:00:00Z'));
    expect(p.start.toISOString()).toBe('2027-07-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2028-01-01T00:00:00.000Z');
  });

  it('yearly, interval=1: any day in 2027 → 2027 calendar year', () => {
    const p = computeCurrentPeriod('yearly', 1, new Date('2027-06-15T00:00:00Z'));
    expect(p.start.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2028-01-01T00:00:00.000Z');
  });

  it('yearly, interval=2: 2027 → 2026-2028 (biennial anchored to year 0)', () => {
    const p = computeCurrentPeriod('yearly', 2, new Date('2027-06-15T00:00:00Z'));
    expect(p.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2028-01-01T00:00:00.000Z');
  });

  it('throws on one_time', () => {
    expect(() => computeCurrentPeriod('one_time', 1, new Date())).toThrow(/one_time/);
  });

  it('throws on interval < 1', () => {
    expect(() => computeCurrentPeriod('monthly', 0, new Date())).toThrow(/interval/);
  });
});

describe('daysBetween', () => {
  it('same day → 0', () => {
    expect(daysBetween(new Date('2027-01-01T00:00:00Z'), new Date('2027-01-01T23:59:59Z'))).toBe(0);
  });

  it('exactly one day → 1', () => {
    expect(daysBetween(new Date('2027-01-01T00:00:00Z'), new Date('2027-01-02T00:00:00Z'))).toBe(1);
  });

  it('February (28 days in 2027) → 28', () => {
    expect(daysBetween(new Date('2027-02-01T00:00:00Z'), new Date('2027-03-01T00:00:00Z'))).toBe(
      28,
    );
  });
});
