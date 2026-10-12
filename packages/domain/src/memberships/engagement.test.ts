import { describe, expect, it } from 'vitest';

import {
  canDemoteEngagement,
  canPromoteEngagement,
  engagementStarCount,
  ENGAGEMENT_TIERS,
  formatEngagementTier,
} from './engagement';

describe('ENGAGEMENT_TIERS', () => {
  it('is ordered dormant < normal < engaged < committed < pillar', () => {
    expect(ENGAGEMENT_TIERS).toEqual(['dormant', 'normal', 'engaged', 'committed', 'pillar']);
  });
});

describe('canPromoteEngagement', () => {
  it('allows moving up any number of rungs', () => {
    expect(canPromoteEngagement('dormant', 'normal')).toBe(true);
    expect(canPromoteEngagement('normal', 'committed')).toBe(true);
    expect(canPromoteEngagement('dormant', 'pillar')).toBe(true);
    expect(canPromoteEngagement('committed', 'pillar')).toBe(true);
  });

  it('rejects lateral moves', () => {
    expect(canPromoteEngagement('normal', 'normal')).toBe(false);
    expect(canPromoteEngagement('pillar', 'pillar')).toBe(false);
  });

  it('rejects moves down the ladder', () => {
    expect(canPromoteEngagement('committed', 'normal')).toBe(false);
    expect(canPromoteEngagement('pillar', 'committed')).toBe(false);
  });
});

describe('canDemoteEngagement', () => {
  it('allows moving down any number of rungs', () => {
    expect(canDemoteEngagement('committed', 'engaged')).toBe(true);
    expect(canDemoteEngagement('engaged', 'dormant')).toBe(true);
    expect(canDemoteEngagement('pillar', 'dormant')).toBe(true);
  });

  it('rejects lateral moves', () => {
    expect(canDemoteEngagement('normal', 'normal')).toBe(false);
  });

  it('rejects moves up the ladder', () => {
    expect(canDemoteEngagement('dormant', 'engaged')).toBe(false);
    expect(canDemoteEngagement('committed', 'pillar')).toBe(false);
  });
});

describe('formatEngagementTier', () => {
  it.each([
    ['dormant', 'Dormant'],
    ['normal', 'Normal'],
    ['engaged', 'Engaged'],
    ['committed', 'Committed'],
    ['pillar', 'Pillar'],
  ] as const)('formats %s as %s', (tier, label) => {
    expect(formatEngagementTier(tier)).toBe(label);
  });
});

describe('engagementStarCount', () => {
  it.each([
    ['dormant', 1],
    ['normal', 2],
    ['engaged', 3],
    ['committed', 4],
    ['pillar', 5],
  ] as const)('maps %s to %s stars', (tier, stars) => {
    expect(engagementStarCount(tier)).toBe(stars);
  });
});
