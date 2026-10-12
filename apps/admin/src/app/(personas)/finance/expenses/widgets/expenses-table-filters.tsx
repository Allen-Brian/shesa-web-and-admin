'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

import type {
  CategoryFilter,
  CategoryOption,
  GroupFilter,
  GroupOption,
  StatusFilter,
} from './expenses-types';

interface ExpensesTableFiltersProps {
  readonly categoryOptions: readonly CategoryOption[];
  readonly category: CategoryFilter;
  readonly onCategoryChange: (v: CategoryFilter) => void;
  readonly status: StatusFilter;
  readonly onStatusChange: (v: StatusFilter) => void;
  readonly groupOptions: readonly GroupOption[];
  readonly group: GroupFilter;
  readonly onGroupChange: (v: GroupFilter) => void;
}

/**
 * Group + category + status three-select cluster rendered in the
 * EntityTablePanel's filters slot. The Group picker is hidden when no
 * expenses in the loaded set touch a group, so the mainstream cluster
 * stays clean when there is no event activity.
 */
export function ExpensesTableFilters({
  categoryOptions,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  groupOptions,
  group,
  onGroupChange,
}: ExpensesTableFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      {groupOptions.length > 0 && (
        <Select value={group} onValueChange={(v) => onGroupChange(v as GroupFilter)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            <SelectItem value="none">Not in a group</SelectItem>
            {groupOptions.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
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
