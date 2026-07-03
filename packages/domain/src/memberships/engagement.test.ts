import { describe, expect, it } from 'vitest';

import {
  canDemoteEngagement,
  canPromoteEngagement,
  ENGAGEMENT_TIERS,
  formatEngagementTier,
} from './engagement';

describe('ENGAGEMENT_TIERS', () => {
  it('is ordered dormant < normal < engaged < committed', () => {
    expect(ENGAGEMENT_TIERS).toEqual(['dormant', 'normal', 'engaged', 'committed']);
  });
});

describe('canPromoteEngagement', () => {
  it('allows moving up any number of rungs', () => {
    expect(canPromoteEngagement('dormant', 'normal')).toBe(true);
    expect(canPromoteEngagement('normal', 'committed')).toBe(true);
    expect(canPromoteEngagement('dormant', 'committed')).toBe(true);
  });

  it('rejects lateral moves', () => {
    expect(canPromoteEngagement('normal', 'normal')).toBe(false);
  });

  it('rejects moves down the ladder', () => {
    expect(canPromoteEngagement('committed', 'normal')).toBe(false);
  });
});

describe('canDemoteEngagement', () => {
  it('allows moving down any number of rungs', () => {
    expect(canDemoteEngagement('committed', 'engaged')).toBe(true);
    expect(canDemoteEngagement('engaged', 'dormant')).toBe(true);
    expect(canDemoteEngagement('committed', 'dormant')).toBe(true);
  });

  it('rejects lateral moves', () => {
    expect(canDemoteEngagement('normal', 'normal')).toBe(false);
  });

  it('rejects moves up the ladder', () => {
    expect(canDemoteEngagement('dormant', 'engaged')).toBe(false);
  });
});

describe('formatEngagementTier', () => {
  it.each([
    ['dormant', 'Dormant'],
    ['normal', 'Normal'],
    ['engaged', 'Engaged'],
    ['committed', 'Committed'],
  ] as const)('formats %s as %s', (tier, label) => {
    expect(formatEngagementTier(tier)).toBe(label);
  });
});
