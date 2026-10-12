import type { FilterDimensionConfig } from '@/components/filters/filter-dropdown';
import type { FilterDimension } from '@/lib/memberships/filter-state';

import { sortedUnique } from './members-table-helpers';
import { ENGAGEMENT_TIERS } from './members-table-types';
import type { MembersPageRow } from './members-page';

/**
 * Build the filter dimensions for the Members table from the actual
 * row set (no dead options). Branch dimension is hidden when the
 * viewer scope is a branch — mirrors the column-hide rule.
 */
export function buildMembersFilterDimensions(
  rows: readonly MembersPageRow[],
  isBranch: boolean,
): FilterDimensionConfig<FilterDimension>[] {
  const configs: FilterDimensionConfig<FilterDimension>[] = [];

  configs.push({
    dimension: 'batch',
    label: 'Batch',
    options: sortedUnique(rows.map((r) => r.batch_name)).map((v) => ({ value: v, label: v })),
  });

  if (!isBranch) {
    configs.push({
      dimension: 'branch',
      label: 'Branch',
      options: sortedUnique(rows.map((r) => r.branch_name)).map((v) => ({ value: v, label: v })),
    });
  }

  configs.push({
    dimension: 'house',
    label: 'House',
    options: sortedUnique(rows.map((r) => r.house_name)).map((v) => ({ value: v, label: v })),
  });

  configs.push({
    dimension: 'network',
    label: 'Network',
    options: sortedUnique(rows.map((r) => r.network_name)).map((v) => ({ value: v, label: v })),
  });

  configs.push({
    dimension: 'engagement',
    label: 'Engagement',
    options: ENGAGEMENT_TIERS.map((v) => ({
      value: v,
      label: v.charAt(0).toUpperCase() + v.slice(1),
    })),
  });

  configs.push({
    dimension: 'membership',
    label: 'Membership status',
    options: (['active', 'passive', 'pending'] as const).map((v) => ({
      value: v,
      label: v.charAt(0).toUpperCase() + v.slice(1),
    })),
  });

  configs.push({
    dimension: 'registration',
    label: 'Registration',
    options: (['not_required', 'pending', 'paid', 'paid_on_behalf', 'waived'] as const).map(
      (v) => ({
        value: v,
        label:
          v === 'not_required'
            ? 'Not required'
            : v === 'paid_on_behalf'
              ? 'Paid on behalf'
              : v.charAt(0).toUpperCase() + v.slice(1),
      }),
    ),
  });

  return configs;
}
