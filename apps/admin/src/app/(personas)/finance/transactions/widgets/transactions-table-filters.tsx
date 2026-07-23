'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';

import {
  Button,
  DatePicker,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shesa/ui';

import type { MethodFilter, ReconciliationFilter, SourceFilter } from './transactions-types';
import { PAYMENT_METHODS } from './transactions-types';

interface TransactionsTableFiltersProps {
  readonly methodFilter: MethodFilter;
  readonly onMethodChange: (m: MethodFilter) => void;
  readonly sourceFilter: SourceFilter;
  readonly onSourceChange: (s: SourceFilter) => void;
  readonly reconciliationFilter: ReconciliationFilter;
  readonly onReconciliationChange: (r: ReconciliationFilter) => void;
  readonly reasonFilter: string;
  readonly onReasonChange: (r: string) => void;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly onDateRangeChange: (from: string, to: string) => void;
  readonly reasonOptions: readonly string[];
}

/**
 * Single "Filters" popover. Consolidates method / source /
 * reconciliation / reason / date range into one control so the table
 * toolbar stays clean. A small count-badge on the trigger button
 * shows how many filters are currently applied.
 */
export function TransactionsTableFilters({
  methodFilter,
  onMethodChange,
  sourceFilter,
  onSourceChange,
  reconciliationFilter,
  onReconciliationChange,
  reasonFilter,
  onReasonChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  reasonOptions,
}: TransactionsTableFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeCount =
    (methodFilter !== 'all' ? 1 : 0) +
    (sourceFilter !== 'all' ? 1 : 0) +
    (reconciliationFilter !== 'all' ? 1 : 0) +
    (reasonFilter ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  const clearAll = () => {
    onMethodChange('all');
    onSourceChange('all');
    onReconciliationChange('all');
    onReasonChange('');
    onDateRangeChange('', '');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-4">
        <div className="flex items-center justify-between pb-3">
          <p className="text-sm font-medium text-foreground">Filters</p>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
              <X className="h-3 w-3" />
              Clear all
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <FilterField label="Date range">
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                value={dateFrom}
                onChange={(v: string) => onDateRangeChange(v, dateTo)}
                placeholder="From"
              />
              <DatePicker
                value={dateTo}
                onChange={(v: string) => onDateRangeChange(dateFrom, v)}
                placeholder="To"
              />
            </div>
          </FilterField>

          <FilterField label="Payment method">
            <Select value={methodFilter} onValueChange={(v) => onMethodChange(v as MethodFilter)}>
              <SelectTrigger className="h-8 text-xs">
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
          </FilterField>

          <FilterField label="Source">
            <Select value={sourceFilter} onValueChange={(v) => onSourceChange(v as SourceFilter)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="manual">Manual entries</SelectItem>
                <SelectItem value="auto">Auto · Website / gateway</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Reconciliation">
            <Select
              value={reconciliationFilter}
              onValueChange={(v) => onReconciliationChange(v as ReconciliationFilter)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unreconciled">Unreconciled only</SelectItem>
                <SelectItem value="reconciled">Reconciled only</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Reason (charge)">
            <Select
              value={reasonFilter || '__all'}
              onValueChange={(v) => onReasonChange(v === '__all' ? '' : v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="__all">All reasons</SelectItem>
                {reasonOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
