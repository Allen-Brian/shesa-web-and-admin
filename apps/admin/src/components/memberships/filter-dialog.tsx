'use client';

import { useEffect, useState } from 'react';
import { Check, Filter } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shesa/ui';

import type { FilterDimension, FilterValues } from '@/lib/memberships/filter-state';

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterDimensionConfig {
  readonly dimension: FilterDimension;
  readonly label: string;
  readonly options: readonly FilterOption[];
}

interface FilterDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly dimensions: readonly FilterDimensionConfig[];
  readonly values: FilterValues;
  readonly onApply: (next: FilterValues) => void;
  readonly onClearAll: () => void;
}

/**
 * Shared filter dialog — reusable across Members / Requests /
 * Transfers / Registration tables. Each consumer passes in the
 * dimensions it wants (see `useScopeAwareVisibility` in the wire-up
 * for hiding redundant dimensions like Branch on a branch admin's
 * table).
 *
 * Local state is a working copy; changes are only committed to the
 * URL when the user hits Apply. Reset drops all filters.
 */
export function FilterDialog({
  open,
  onOpenChange,
  dimensions,
  values,
  onApply,
  onClearAll,
}: FilterDialogProps) {
  const [draft, setDraft] = useState<FilterValues>(values);

  // Re-sync whenever the dialog opens.
  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  const toggle = (dim: FilterDimension, value: string) => {
    setDraft((prev) => {
      const current = prev[dim] ?? [];
      const has = current.includes(value);
      const next = has ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [dim]: next.length > 0 ? next : undefined };
    });
  };

  const clear = () => setDraft({});

  const apply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </DialogTitle>
          <DialogDescription>
            Multi-select any dimension; empty dimensions are ignored. Filters survive refresh via
            URL params.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          {dimensions.map((dc) => (
            <DimensionSection
              key={dc.dimension}
              config={dc}
              selected={draft[dc.dimension] ?? []}
              onToggle={(v) => toggle(dc.dimension, v)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              clear();
              onClearAll();
              onOpenChange(false);
            }}
          >
            Clear all
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DimensionSection({
  config,
  selected,
  onToggle,
}: {
  readonly config: FilterDimensionConfig;
  readonly selected: readonly string[];
  readonly onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {config.label}
        {selected.length > 0 && <span className="ml-1.5 text-primary">({selected.length})</span>}
      </div>
      <div className="flex flex-col gap-1">
        {config.options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={
                active
                  ? 'flex items-center justify-between rounded-md bg-primary/10 px-2 py-1 text-left text-sm text-primary hover:bg-primary/20'
                  : 'flex items-center justify-between rounded-md px-2 py-1 text-left text-sm text-foreground hover:bg-muted/50'
              }
            >
              <span>{opt.label}</span>
              {active && <Check className="h-4 w-4" />}
            </button>
          );
        })}
        {config.options.length === 0 && (
          <div className="text-xs italic text-muted-foreground">No values available.</div>
        )}
      </div>
    </div>
  );
}
