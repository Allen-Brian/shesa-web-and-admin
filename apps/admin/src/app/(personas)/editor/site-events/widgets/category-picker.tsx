'use client';

import { useMemo } from 'react';
import { Layers } from 'lucide-react';

import { Button } from '@shesa/ui';

import type { CategoryRow } from './types';

interface Props {
  readonly categories: readonly CategoryRow[];
  readonly selectedIds: readonly string[];
  readonly onToggle: (id: string) => void;
  readonly onManage: () => void;
}

/** Multi-select category chips — same shape as the news + projects pickers. */
export function CategoryPicker({ categories, selectedIds, onToggle, onManage }: Props) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Categories</span>
        <Button type="button" variant="ghost" size="sm" onClick={onManage}>
          <Layers className="h-3.5 w-3.5" />
          Manage
        </Button>
      </div>
      {categories.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          No categories yet — open Manage to create some (Reunion, Ceremony, …).
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const isOn = selected.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isOn
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
