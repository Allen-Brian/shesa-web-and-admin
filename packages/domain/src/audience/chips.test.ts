/**
 * Vitest — audienceChips helper.
 *
 * Covers:
 *   - AUDIENCE_ALL renders the single "All members" chip with isAll=true.
 *   - Each group renders its own chip.
 *   - Multiple values within a group join with " + " into one chip.
 *   - Label maps resolve ids to labels; missing keys fall back to the id.
 *   - Location group renders as one chip, OR-within (countries/regions/cities).
 *   - Truncation (maxChips) collapses tail into "+N more".
 */

import { describe, expect, it } from 'vitest';

import { audienceChips, type AudienceLabelMaps } from './chips';
import { AUDIENCE_ALL, type AudienceDefinition } from './schema';

const H_ST_THOMAS = '33333333-0000-0000-0000-000000000001';
const H_ST_PETER = '33333333-0000-0000-0000-000000000002';
const N_LEGAL = '44444444-0000-0000-0000-000000000001';
const B_BUEA = '00000000-0000-0000-0000-000000000010';

const labels: AudienceLabelMaps = {
  scopes: new Map([[B_BUEA, 'Shesa Buea']]),
  houses: new Map([
    [H_ST_THOMAS, 'St Thomas'],
    [H_ST_PETER, 'St Peter'],
  ]),
  networks: new Map([[N_LEGAL, 'Legal']]),
  batches: new Map(),
  countries: new Map([['CM', 'Cameroon']]),
};

describe('audienceChips', () => {
  it('renders "All members" chip with isAll=true for AUDIENCE_ALL', () => {
    const result = audienceChips(AUDIENCE_ALL, labels);
    expect(result.isAll).toBe(true);
    expect(result.chips).toEqual(['All members']);
  });

  it('renders one chip per group with resolved labels', () => {
    const def: AudienceDefinition = {
      version: 1,
      membership: { mode: 'specific', scopeIds: [B_BUEA] },
      location: { mode: 'all' },
      houses: { mode: 'specific', scopeIds: [H_ST_THOMAS] },
      networks: { mode: 'specific', scopeIds: [N_LEGAL] },
      batches: { mode: 'all' },
    };
    const result = audienceChips(def, labels);
    expect(result.isAll).toBe(false);
    expect(result.chips).toEqual(['Shesa Buea', 'St Thomas', 'Legal']);
  });

  it('joins multiple values within a group with " + "', () => {
    const def: AudienceDefinition = {
      ...AUDIENCE_ALL,
      houses: { mode: 'specific', scopeIds: [H_ST_THOMAS, H_ST_PETER] },
    };
    const result = audienceChips(def, labels);
    expect(result.chips).toEqual(['St Thomas + St Peter']);
  });

  it('falls back to the raw id when the label map is missing an entry', () => {
    const def: AudienceDefinition = {
      ...AUDIENCE_ALL,
      houses: { mode: 'specific', scopeIds: [H_ST_THOMAS] },
    };
    const result = audienceChips(def, {}); // empty maps
    expect(result.chips).toEqual([H_ST_THOMAS]);
  });

  it('renders Location as a single chip with OR-within values', () => {
    const def: AudienceDefinition = {
      ...AUDIENCE_ALL,
      location: {
        mode: 'specific',
        countries: ['CM'],
        regions: ['Centre'],
        cities: ['Yaoundé'],
      },
    };
    const result = audienceChips(def, labels);
    expect(result.chips).toEqual(['Cameroon + Centre + Yaoundé']);
  });

  it('truncates to maxChips with "+N more"', () => {
    const def: AudienceDefinition = {
      version: 1,
      membership: { mode: 'specific', scopeIds: [B_BUEA] },
      location: { mode: 'specific', countries: ['CM'] },
      houses: { mode: 'specific', scopeIds: [H_ST_THOMAS] },
      networks: { mode: 'specific', scopeIds: [N_LEGAL] },
      batches: { mode: 'all' },
    };
    const result = audienceChips(def, labels, { maxChips: 2 });
    expect(result.chips).toEqual(['Shesa Buea', 'Cameroon', '+2 more']);
  });
});
