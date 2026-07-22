'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * URL-backed filter state generalised from the memberships table hook.
 * Every table filter in the admin uses the same pattern: multi-select
 * dimensions are stored under their own search-param key as a
 * comma-separated list, so links stay clean and shareable, and state
 * survives navigation + refresh.
 *
 * Callers pass their own dimension keys — the memberships hook keeps
 * its own dedicated copy for backwards-compat, but every new table
 * (Charges first) uses this shared version.
 */

export type FilterValues<TDim extends string = string> = Partial<Record<TDim, readonly string[]>>;

export interface UseFilterStateResult<TDim extends string = string> {
  readonly values: FilterValues<TDim>;
  readonly setValues: (next: FilterValues<TDim>) => void;
  readonly activeCount: number;
  readonly clearAll: () => void;
  readonly clearDimension: (dim: TDim) => void;
  readonly removeValue: (dim: TDim, value: string) => void;
}

export function useFilterState<TDim extends string>(
  dimensions: readonly TDim[],
): UseFilterStateResult<TDim> {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = useMemo<FilterValues<TDim>>(() => {
    const out: FilterValues<TDim> = {};
    for (const dim of dimensions) {
      const raw = params?.get(dim);
      if (raw && raw.length > 0) {
        (out as Record<TDim, readonly string[]>)[dim] = raw.split(',').filter(Boolean);
      }
    }
    return out;
  }, [params, dimensions]);

  const activeCount = useMemo(
    () =>
      Object.values(values).reduce(
        (n: number, v) => n + ((v as readonly string[])?.length ?? 0),
        0,
      ),
    [values],
  );

  const setValues = useCallback(
    (next: FilterValues<TDim>) => {
      const query = new URLSearchParams(params?.toString() ?? '');
      for (const dim of dimensions) {
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
    [params, pathname, router, dimensions],
  );

  const clearDimension = useCallback(
    (dim: TDim) => setValues({ ...values, [dim]: undefined }),
    [values, setValues],
  );

  const clearAll = useCallback(() => setValues({} as FilterValues<TDim>), [setValues]);

  const removeValue = useCallback(
    (dim: TDim, value: string) => {
      const current = (values[dim] ?? []) as readonly string[];
      const next = current.filter((v) => v !== value);
      setValues({ ...values, [dim]: next.length > 0 ? next : undefined });
    },
    [values, setValues],
  );

  return { values, setValues, activeCount, clearAll, clearDimension, removeValue };
}
