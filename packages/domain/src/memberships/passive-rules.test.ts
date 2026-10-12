import { describe, expect, it } from 'vitest';

import { canMarkPassive } from './passive-rules';

describe('canMarkPassive', () => {
  it('allows on a branch membership', () => {
    expect(canMarkPassive({ scopeType: 'branch' }).allowed).toBe(true);
  });

  it('allows on an autonomous chapter membership', () => {
    expect(canMarkPassive({ scopeType: 'chapter', chapterKind: 'autonomous' }).allowed).toBe(true);
  });

  it('rejects on a grouping chapter (not geographic in the membership sense)', () => {
    const r = canMarkPassive({ scopeType: 'chapter', chapterKind: 'grouping' });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/geographic/);
  });

  it('rejects on a batch/house/network (not a geographic membership at all)', () => {
    for (const scopeType of ['batch', 'house', 'network'] as const) {
      const r = canMarkPassive({ scopeType });
      expect(r.allowed).toBe(false);
    }
  });
});
