import { describe, expect, it } from 'vitest';

import { DEFAULT_EXIT_YEAR_OFFSET, defaultExitYear } from './exit-year';

describe('defaultExitYear', () => {
  it('adds seven years to the entry year by default', () => {
    expect(defaultExitYear(2010)).toBe(2017);
  });

  it('is a pure function of the offset constant', () => {
    expect(defaultExitYear(1953)).toBe(1953 + DEFAULT_EXIT_YEAR_OFFSET);
  });
});
