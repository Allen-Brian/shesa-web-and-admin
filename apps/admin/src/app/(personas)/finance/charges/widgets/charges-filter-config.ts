import { Building2, CircleDot, Layers, ToggleRight, User } from 'lucide-react';

import type { FilterDimensionConfig } from '@/components/filters/filter-dropdown';

/**
 * Every dimension the Charges filter dropdown offers, in the order
 * they appear in the left rail. Values are hardcoded because the
 * dimensions are fixed enums (target party type, shape, status).
 * Keeping the config in a plain file so both the view (dropdown +
 * chips) and the URL filter state can import from one source.
 */
export const CHARGES_FILTER_DIMENSIONS = ['type', 'shape', 'status'] as const;
export type ChargesFilterDim = (typeof CHARGES_FILTER_DIMENSIONS)[number];

export const CHARGES_FILTER_CONFIG: readonly FilterDimensionConfig<ChargesFilterDim>[] = [
  {
    dimension: 'type',
    label: 'Type',
    Icon: User,
    options: [
      { value: 'member', label: 'Individual' },
      { value: 'branch', label: 'Group' },
    ],
  },
  {
    dimension: 'shape',
    label: 'Shape',
    Icon: Layers,
    options: [
      { value: 'charge', label: 'Charge' },
      { value: 'fixed', label: 'Fixed' },
    ],
  },
  {
    dimension: 'status',
    label: 'Status',
    Icon: ToggleRight,
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'active', label: 'Active' },
      { value: 'paused', label: 'Paused' },
      { value: 'archived', label: 'Archived' },
    ],
  },
];

/**
 * Type + status filter icons re-exported here so the empty-filter
 * label row (used by the chips block above the table) can render a
 * matching Group / Individual chip glyph without redeclaring.
 */
export const CHARGES_ICON_MAP = { Building2, CircleDot };
