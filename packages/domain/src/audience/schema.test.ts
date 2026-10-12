/**
 * Vitest — AudienceDefinition Zod schema.
 *
 * Covers:
 *   - Well-formed 'all' and 'specific' payloads parse.
 *   - Wrong version fails.
 *   - Empty scopeIds array in 'specific' fails.
 *   - Location 'specific' with no country/region/city fails the refine.
 *   - Extra keys fail (strict).
 *   - isAudienceAll returns true only when every group is 'all'.
 */

import { describe, expect, it } from 'vitest';

import { AudienceDefinition, AUDIENCE_ALL, isAudienceAll } from './schema';

describe('AudienceDefinition', () => {
  it('parses the all-all-all-all-all default', () => {
    const result = AudienceDefinition.safeParse(AUDIENCE_ALL);
    expect(result.success).toBe(true);
  });

  it('parses a specific membership + all others', () => {
    const result = AudienceDefinition.safeParse({
      version: 1,
      membership: {
        mode: 'specific',
        scopeIds: ['00000000-0000-0000-0000-000000000010'],
      },
      location: { mode: 'all' },
      houses: { mode: 'all' },
      networks: { mode: 'all' },
      batches: { mode: 'all' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown version', () => {
    const result = AudienceDefinition.safeParse({
      ...AUDIENCE_ALL,
      version: 2 as unknown as 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects specific membership with an empty scopeIds array', () => {
    const result = AudienceDefinition.safeParse({
      ...AUDIENCE_ALL,
      membership: { mode: 'specific', scopeIds: [] as string[] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid scope id', () => {
    const result = AudienceDefinition.safeParse({
      ...AUDIENCE_ALL,
      houses: { mode: 'specific', scopeIds: ['not-a-uuid'] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects location.specific with no country/region/city (refine)', () => {
    const result = AudienceDefinition.safeParse({
      ...AUDIENCE_ALL,
      location: { mode: 'specific' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts location.specific with only countries populated', () => {
    const result = AudienceDefinition.safeParse({
      ...AUDIENCE_ALL,
      location: { mode: 'specific', countries: ['CM'] },
    });
    expect(result.success).toBe(true);
  });

  it('accepts location.specific with only cities populated (OR-within)', () => {
    const result = AudienceDefinition.safeParse({
      ...AUDIENCE_ALL,
      location: { mode: 'specific', cities: ['Yaoundé'] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects extra top-level keys (strict)', () => {
    const result = AudienceDefinition.safeParse({
      ...AUDIENCE_ALL,
      bogus: 'extra',
    });
    expect(result.success).toBe(false);
  });
});

describe('isAudienceAll', () => {
  it('is true for AUDIENCE_ALL', () => {
    expect(isAudienceAll(AUDIENCE_ALL)).toBe(true);
  });

  it('is false when any single group is specific', () => {
    expect(
      isAudienceAll({
        ...AUDIENCE_ALL,
        batches: {
          mode: 'specific',
          scopeIds: ['00000000-0000-0000-0000-000000000010'],
        },
      }),
    ).toBe(false);
  });
});
