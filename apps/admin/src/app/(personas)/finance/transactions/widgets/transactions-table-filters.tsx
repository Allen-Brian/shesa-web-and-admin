'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

import type { MethodFilter, ReconciliationFilter, SourceFilter } from './transactions-types';
import { PAYMENT_METHODS } from './transactions-types';

interface TransactionsTableFiltersProps {
  readonly methodFilter: MethodFilter;
  readonly onMethodChange: (m: MethodFilter) => void;
  readonly sourceFilter: SourceFilter;
  readonly onSourceChange: (s: SourceFilter) => void;
  readonly reconciliationFilter: ReconciliationFilter;
  readonly onReconciliationChange: (r: ReconciliationFilter) => void;
}

/**
 * Three-select filter cluster rendered inside the EntityTablePanel's
 * `filters` slot. Method / Source / Reconciliation — grouped so both
 * selects share the same visual language.
 */
export function TransactionsTableFilters({
  methodFilter,
  onMethodChange,
  sourceFilter,
  onSourceChange,
  reconciliationFilter,
  onReconciliationChange,
}: TransactionsTableFiltersProps) {
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
      <Select
        value={reconciliationFilter}
        onValueChange={(v) => onReconciliationChange(v as ReconciliationFilter)}
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All reconciliation</SelectItem>
          <SelectItem value="unreconciled">Unreconciled only</SelectItem>
          <SelectItem value="reconciled">Reconciled only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
