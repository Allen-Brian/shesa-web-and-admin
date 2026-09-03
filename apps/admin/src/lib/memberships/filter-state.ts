'use client';

import {
  useFilterState as useGenericFilterState,
  type FilterValues as GenericFilterValues,
  type UseFilterStateResult,
} from '@/lib/filters/use-filter-state';

/**
 * The dimension set the Memberships tables filter on.
 *
 * The mechanics — comma-separated lists under one search-param key per
 * dimension, empty dimensions stripped so the link stays clean and
 * shareable — live in `@/lib/filters/use-filter-state`. This file is
 * now just the dimension list; it used to carry a second copy of that
 * hook, which drifted from the shared one it was generalised from.
 *
 * Range dimensions (exit year, age) can be added later with a
 * `{key}_min` / `{key}_max` param pair; the shape here doesn't lock
 * that out.
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

export type FilterValues = GenericFilterValues<FilterDimension>;

export function useFilterState(): UseFilterStateResult<FilterDimension> {
  return useGenericFilterState(FILTER_DIMENSIONS);
}
