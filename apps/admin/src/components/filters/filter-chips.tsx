'use client';

import { X } from 'lucide-react';

import { Badge, Button } from '@shesa/ui';

import type { FilterValues } from '@/lib/filters/use-filter-state';

import type { FilterDimensionConfig } from './filter-dropdown';

interface FilterChipsProps<TDim extends string> {
  readonly values: FilterValues<TDim>;
  readonly dimensions: readonly FilterDimensionConfig<TDim>[];
  readonly onRemove: (dim: TDim, value: string) => void;
  readonly onClearAll: () => void;
}

/**
 * Chips row above a filtered table — one chip per selected value,
 * grouped by dimension. Each chip has an × to remove that single
 * value; a "Clear all" button appears when two or more chips render.
 * Renders nothing when no filters are set so the toolbar stays clean.
 */
export function FilterChips<TDim extends string = string>({
  values,
  dimensions,
  onRemove,
  onClearAll,
}: FilterChipsProps<TDim>) {
  const configByDim = new Map(dimensions.map((d) => [d.dimension, d]));

  const chips: { dim: TDim; value: string; label: string; dimLabel: string }[] = [];
  for (const [dim, list] of Object.entries(values) as [TDim, readonly string[] | undefined][]) {
    if (!list) continue;
    const config = configByDim.get(dim);
    if (!config) continue;
    for (const v of list) {
      const opt = config.options.find((o) => o.value === v);
      chips.push({
        dim,
        value: v,
        label: opt?.label ?? v,
        dimLabel: config.label,
      });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <Badge key={`${c.dim}:${c.value}`} variant="outline" className="gap-1 pl-2 pr-1">
          <span className="text-xs text-muted-foreground">{c.dimLabel}:</span>
          <span className="text-sm text-foreground">{c.label}</span>
          <button
            type="button"
            aria-label={`Remove ${c.dimLabel}: ${c.label}`}
            onClick={() => onRemove(c.dim, c.value)}
            className="ml-1 rounded-sm p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {chips.length >= 2 && (
        <Button type="button" variant="ghost" size="sm" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}
