import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('joins truthy class strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, '', 'c')).toBe('a c');
  });

  it('resolves conflicting Tailwind utilities in favor of the last one', () => {
    // twMerge's core promise — the reason we don't just use clsx alone.
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('preserves non-conflicting utilities alongside a conflict', () => {
    expect(cn('rounded-md px-2 text-sm', 'px-4')).toContain('rounded-md');
    expect(cn('rounded-md px-2 text-sm', 'px-4')).toContain('text-sm');
  });

  it('flattens nested arrays', () => {
    expect(cn(['a', 'b'], ['c'])).toBe('a b c');
  });
});
