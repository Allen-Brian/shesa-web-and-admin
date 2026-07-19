'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

import type { MethodFilter, SourceFilter } from './payments-types';
import { PAYMENT_METHODS } from './payments-types';

interface PaymentsTableFiltersProps {
  readonly methodFilter: MethodFilter;
  readonly onMethodChange: (m: MethodFilter) => void;
  readonly sourceFilter: SourceFilter;
  readonly onSourceChange: (s: SourceFilter) => void;
}

/**
 * Two-select filter cluster rendered inside the EntityTablePanel's
 * `filters` slot. Kept separate from the panel so both selects can
 * share the same visual language without the orchestrator threading
 * a heavy JSX blob through.
 */
export function PaymentsTableFilters({
  methodFilter,
  onMethodChange,
  sourceFilter,
  onSourceChange,
}: PaymentsTableFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={methodFilter} onValueChange={(v) => onMethodChange(v as MethodFilter)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All methods</SelectItem>
          {PAYMENT_METHODS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sourceFilter} onValueChange={(v) => onSourceChange(v as SourceFilter)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          <SelectItem value="manual">Manual entries</SelectItem>
          <SelectItem value="auto">Auto / gateway</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
