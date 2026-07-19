'use client';

import { Search } from 'lucide-react';

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

import type { ScopeTypeFilter, SortKey } from './treasury-landing-types';
import { SCOPE_TYPE_LABELS } from './treasury-landing-types';

interface TreasuryFiltersBarProps {
  readonly search: string;
  readonly onSearchChange: (v: string) => void;
  readonly scopeType: ScopeTypeFilter;
  readonly onScopeTypeChange: (v: ScopeTypeFilter) => void;
  readonly sort: SortKey;
  readonly onSortChange: (v: SortKey) => void;
  readonly availableScopeTypes: ReadonlySet<ScopeTypeFilter>;
  readonly filteredCount: number;
  readonly totalCount: number;
}

/**
 * Filters row for the treasury landing — search input, scope-type
 * select (only offers the buckets that actually exist in the
 * portfolio), sort select, and a right-aligned "filtered of total"
 * count.
 */
export function TreasuryFiltersBar({
  search,
  onSearchChange,
  scopeType,
  onScopeTypeChange,
  sort,
  onSortChange,
  availableScopeTypes,
  filteredCount,
  totalCount,
}: TreasuryFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search treasuries…"
          className="h-9 pl-8"
        />
      </div>
      <Select value={scopeType} onValueChange={(v) => onScopeTypeChange(v as ScopeTypeFilter)}>
        <SelectTrigger className="h-9 w-40 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {(['mainstream', 'branch', 'chapter', 'other'] as const)
            .filter((t) => availableScopeTypes.has(t))
            .map((t) => (
              <SelectItem key={t} value={t}>
                {SCOPE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
        <SelectTrigger className="h-9 w-44 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Sort · Name</SelectItem>
          <SelectItem value="balance_desc">Sort · Balance high → low</SelectItem>
          <SelectItem value="balance_asc">Sort · Balance low → high</SelectItem>
          <SelectItem value="activity">Sort · Most active</SelectItem>
          <SelectItem value="net_flow">Sort · Net flow high → low</SelectItem>
        </SelectContent>
      </Select>
      <span className="ml-auto text-xs text-muted-foreground">
        {filteredCount} of {totalCount} {totalCount === 1 ? 'treasury' : 'treasuries'}
      </span>
    </div>
  );
}
