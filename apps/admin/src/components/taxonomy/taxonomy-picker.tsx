'use client';

import { useMemo } from 'react';
import { Layers } from 'lucide-react';

import { Button } from '@shesa/ui';

import type { TaxonomyRow } from './taxonomy-types';

interface Props {
  readonly label: string;
  readonly rows: readonly TaxonomyRow[];
  readonly selectedIds: readonly string[];
  readonly onToggle: (id: string) => void;
  readonly onManage: () => void;
  /**
   * Shown in place of the chips when nothing exists yet. Surfaces name
   * their own examples, which is the whole difference between the four
   * copies this replaces.
   */
  readonly emptyHint: string;
}

/** Multi-select chips over a taxonomy, with a shortcut into its manager. */
export function TaxonomyPicker({ label, rows, selectedIds, onToggle, onManage, emptyHint }: Props) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onManage}>
          <Layers className="h-3.5 w-3.5" />
          Manage
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((row) => {
            const isOn = selected.has(row.id);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onToggle(row.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isOn
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {row.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
