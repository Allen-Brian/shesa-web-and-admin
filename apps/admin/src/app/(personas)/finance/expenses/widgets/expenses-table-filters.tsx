'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

import type { CategoryFilter, CategoryOption, StatusFilter } from './expenses-types';

interface ExpensesTableFiltersProps {
  readonly categoryOptions: readonly CategoryOption[];
  readonly category: CategoryFilter;
  readonly onCategoryChange: (v: CategoryFilter) => void;
  readonly status: StatusFilter;
  readonly onStatusChange: (v: StatusFilter) => void;
}

/**
 * Category + status two-select cluster rendered in the
 * EntityTablePanel's filters slot.
 */
export function ExpensesTableFilters({
  categoryOptions,
  category,
  onCategoryChange,
  status,
  onStatusChange,
}: ExpensesTableFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={category} onValueChange={(v) => onCategoryChange(v as CategoryFilter)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categoryOptions.map((c) => (
            <SelectItem key={c.id} value={c.key}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="recorded">Recorded</SelectItem>
          <SelectItem value="pending_approval">Pending approval</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
