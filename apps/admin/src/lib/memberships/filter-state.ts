'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * URL-backed filter state for the Memberships tables.
 *
 * Each dimension is stored as a comma-separated list under its own
 * search-param key. Empty dimensions are stripped from the URL so the
 * link stays clean. State survives navigation, refresh, and can be
 * shared between admins ("here's the exact filter I'm looking at").
 *
 * Kept intentionally minimal — five multi-select dimensions for the
 * first pass. Range dimensions (exit year, age) can be added later
 * with a `{key}_min` / `{key}_max` param pair; the shape here doesn't
 * lock that out.
 */

export const FILTER_DIMENSIONS = [
  'batch',
  'branch',
  'house',
  'network',
  'engagement',
  'membership',
  'registration',
] as const;

export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

export type FilterValues = Partial<Record<FilterDimension, readonly string[]>>;

export function useFilterState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = useMemo<FilterValues>(() => {
    const out: FilterValues = {};
    for (const dim of FILTER_DIMENSIONS) {
      const raw = params?.get(dim);
      if (raw && raw.length > 0) {
        out[dim] = raw.split(',').filter(Boolean);
      }
    }
    return out;
  }, [params]);

  const activeCount = useMemo(
    () => Object.values(values).reduce((n, v) => n + (v?.length ?? 0), 0),
    [values],
  );

  const setValues = useCallback(
    (next: FilterValues) => {
      const query = new URLSearchParams(params?.toString() ?? '');
      for (const dim of FILTER_DIMENSIONS) {
        const v = next[dim];
        if (v && v.length > 0) {
          query.set(dim, v.join(','));
        } else {
          query.delete(dim);
        }
      }
      const qs = query.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const clearDimension = useCallback(
    (dim: FilterDimension) => setValues({ ...values, [dim]: undefined }),
    [values, setValues],
  );

  const clearAll = useCallback(() => setValues({}), [setValues]);

  const removeValue = useCallback(
    (dim: FilterDimension, value: string) => {
      const current = values[dim] ?? [];
      const next = current.filter((v) => v !== value);
      setValues({ ...values, [dim]: next.length > 0 ? next : undefined });
    },
    [values, setValues],
  );

  return { values, setValues, activeCount, clearAll, clearDimension, removeValue };
}
