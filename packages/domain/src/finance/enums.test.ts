import { describe, expect, it } from 'vitest';

import {
  CHARGE_SHAPES,
  createsObligations,
  EXCEPTION_PRIORITY_BANDS,
  isExtended,
  isFinanceBearing,
  OBLIGATION_CREATING_SHAPES,
} from './enums';

describe('CHARGE_SHAPES', () => {
  it('matches the DB enum exactly (6 values, lowercase)', () => {
    expect(CHARGE_SHAPES).toEqual(['charge', 'goal', 'open', 'ticketed', 'fixed', 'donation']);
  });
});

describe('createsObligations', () => {
  it('is true for charge + fixed only', () => {
    expect(createsObligations('charge')).toBe(true);
    expect(createsObligations('fixed')).toBe(true);
  });

  it('is false for the voluntary shapes (spec: contributions/donations have no arrears)', () => {
    expect(createsObligations('goal')).toBe(false);
    expect(createsObligations('open')).toBe(false);
    expect(createsObligations('ticketed')).toBe(false);
    expect(createsObligations('donation')).toBe(false);
  });

  it('OBLIGATION_CREATING_SHAPES stays in sync with the function', () => {
    for (const s of CHARGE_SHAPES) {
      expect(createsObligations(s)).toBe(OBLIGATION_CREATING_SHAPES.includes(s));
    }
  });
});

describe('isExtended', () => {
  const now = new Date('2026-08-15T00:00:00Z');
  const pastClose = new Date('2026-08-10T00:00:00Z');
  const futureClose = new Date('2026-09-01T00:00:00Z');

  it('is true when open, past close, and extended at least once', () => {
    expect(isExtended('open', pastClose, 1, now)).toBe(true);
    expect(isExtended('open', pastClose, 3, now)).toBe(true);
  });

  it('is false when never extended', () => {
    expect(isExtended('open', pastClose, 0, now)).toBe(false);
  });

  it('is false when still within the original window', () => {
    expect(isExtended('open', futureClose, 1, now)).toBe(false);
  });

  it('is false when lifecycle is not open', () => {
    expect(isExtended('closed', pastClose, 5, now)).toBe(false);
    expect(isExtended('draft', pastClose, 5, now)).toBe(false);
    expect(isExtended('archived', pastClose, 5, now)).toBe(false);
  });
});

describe('EXCEPTION_PRIORITY_BANDS', () => {
  it('respects spec ordering: individual > attribute > group > base', () => {
    expect(EXCEPTION_PRIORITY_BANDS.individual).toBeGreaterThan(EXCEPTION_PRIORITY_BANDS.attribute);
    expect(EXCEPTION_PRIORITY_BANDS.attribute).toBeGreaterThan(EXCEPTION_PRIORITY_BANDS.group);
    expect(EXCEPTION_PRIORITY_BANDS.group).toBeGreaterThan(EXCEPTION_PRIORITY_BANDS.base);
  });
});

describe('isFinanceBearing', () => {
  it('mainstream + branch are always finance-bearing', () => {
    expect(isFinanceBearing('mainstream', null)).toBe(true);
    expect(isFinanceBearing('branch', null)).toBe(true);
  });

  it('autonomous chapter is finance-bearing; grouping chapter is not', () => {
    expect(isFinanceBearing('chapter', 'autonomous')).toBe(true);
    expect(isFinanceBearing('chapter', 'grouping')).toBe(false);
  });

  it('chapter with missing kind errs safely on false', () => {
    expect(isFinanceBearing('chapter', null)).toBe(false);
    expect(isFinanceBearing('chapter', undefined)).toBe(false);
  });

  it('batch / house / network never hold a treasury (spec lock #1)', () => {
    expect(isFinanceBearing('batch', null)).toBe(false);
    expect(isFinanceBearing('house', null)).toBe(false);
    expect(isFinanceBearing('network', null)).toBe(false);
  });
});
