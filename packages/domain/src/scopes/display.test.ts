import { describe, expect, it } from 'vitest';

import { resolveScopeDisplayName, SHESA_GLOBAL_LABEL } from './display';

describe('resolveScopeDisplayName', () => {
  it('renders mainstream as "Shesa Global"', () => {
    expect(resolveScopeDisplayName({ scope_type: 'mainstream', name: 'Anything' })).toBe(
      SHESA_GLOBAL_LABEL,
    );
  });

  it('renders non-mainstream by name', () => {
    expect(resolveScopeDisplayName({ scope_type: 'branch', name: 'Shesa Buea' })).toBe(
      'Shesa Buea',
    );
  });

  it('accepts camelCase scopeType too', () => {
    expect(resolveScopeDisplayName({ scopeType: 'mainstream', name: 'irrelevant' })).toBe(
      SHESA_GLOBAL_LABEL,
    );
  });

  it('returns empty string for null/undefined scope', () => {
    expect(resolveScopeDisplayName(null)).toBe('');
    expect(resolveScopeDisplayName(undefined)).toBe('');
  });

  it('returns empty string when name is missing on non-mainstream scope', () => {
    expect(resolveScopeDisplayName({ scope_type: 'branch' })).toBe('');
  });
});
