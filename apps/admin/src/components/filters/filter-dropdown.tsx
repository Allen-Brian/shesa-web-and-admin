'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Check, ChevronRight, Filter } from 'lucide-react';

import { Button, Popover, PopoverContent, PopoverTrigger, Separator, cn } from '@shesa/ui';

import type { FilterValues } from '@/lib/filters/use-filter-state';

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterDimensionConfig<TDim extends string = string> {
  readonly dimension: TDim;
  readonly label: string;
  readonly options: readonly FilterOption[];
  readonly Icon?: (props: { className?: string }) => ReactNode;
}

interface FilterDropdownProps<TDim extends string> {
  readonly dimensions: readonly FilterDimensionConfig<TDim>[];
  readonly values: FilterValues<TDim>;
  readonly onApply: (next: FilterValues<TDim>) => void;
  readonly onClearAll: () => void;
  readonly activeCount: number;
}

/**
 * The two-pane category → value picker behind every table filter in
 * the admin — Members, the Manage Membership tabs, cluster details,
 * Charges. Generic over the dimension key so a caller can hand it
 * either a plain-string set or its own union, which is what let the
 * memberships fork fold back into this file.
 *
 * Local draft is committed to the parent's URL-backed values only on
 * Apply. Reset drops everything and closes.
 */
export function FilterDropdown<TDim extends string = string>({
  dimensions,
  values,
  onApply,
  onClearAll,
  activeCount,
}: FilterDropdownProps<TDim>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues<TDim>>(values);
  const [selectedDim, setSelectedDim] = useState<TDim | null>(dimensions[0]?.dimension ?? null);

  useEffect(() => {
    if (open) {
      setDraft(values);
      setSelectedDim((prev) => prev ?? dimensions[0]?.dimension ?? null);
    }
  }, [open, values, dimensions]);

  const toggle = (dim: TDim, value: string) => {
    setDraft((prev) => {
      const current = (prev[dim] ?? []) as readonly string[];
      const has = current.includes(value);
      const next = has ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [dim]: next.length > 0 ? next : undefined };
    });
  };

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  const reset = () => {
    setDraft({});
    onClearAll();
    setOpen(false);
  };

  const activeDim = dimensions.find((d) => d.dimension === selectedDim) ?? dimensions[0] ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant={activeCount > 0 ? 'default' : 'outline'}>
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 rounded-md bg-primary-foreground/20 px-1.5 py-0.5 text-xs">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[560px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Reset all
          </Button>
          <Button type="button" size="sm" onClick={apply}>
            Apply
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-[220px_1fr]">
          <div className="flex max-h-96 flex-col overflow-y-auto border-r border-border py-1">
            {dimensions.map((dc) => {
              const active = selectedDim === dc.dimension;
              const count = (draft[dc.dimension] as readonly string[] | undefined)?.length ?? 0;
              const Icon = dc.Icon;
              return (
                <button
                  key={dc.dimension}
                  type="button"
                  onClick={() => setSelectedDim(dc.dimension)}
                  className={cn(
                    'flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
                    active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
                    <span className="truncate">{dc.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {count > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {count}
                      </span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex max-h-96 flex-col overflow-y-auto p-2">
            {activeDim ? (
              <ValueList
                config={activeDim}
                selected={(draft[activeDim.dimension] as readonly string[] | undefined) ?? []}
                onToggle={(v) => toggle(activeDim.dimension, v)}
              />
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No filters available.
              </div>
            )}
          </div>
        </div>

        {activeCount === 0 && (
          <>
            <Separator />
            <div className="px-3 py-2 text-[11px] text-muted-foreground">
              Multi-select any dimension. Applied filters live in the URL — refresh-safe and
              shareable.
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ValueList({
  config,
  selected,
  onToggle,
}: {
  readonly config: FilterDimensionConfig<string>;
  readonly selected: readonly string[];
  readonly onToggle: (value: string) => void;
}) {
  if (config.options.length === 0) {
    return (
      <div className="p-4 text-sm italic text-muted-foreground">No values in the current set.</div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      {config.options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={cn(
              'flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
              active
                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                : 'text-foreground hover:bg-muted/50',
            )}
          >
            <span className="truncate">{opt.label}</span>
            {active && <Check className="h-4 w-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
