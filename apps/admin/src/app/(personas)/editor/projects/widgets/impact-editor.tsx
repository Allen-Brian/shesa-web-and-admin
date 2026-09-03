'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

import type { ImpactStat } from './project-widget-types';

interface Props {
  readonly stats: readonly ImpactStat[];
  readonly onChange: (next: readonly ImpactStat[]) => void;
}

/**
 * Inline editor for the ordered impact-stats list ("35% To goal",
 * "820+ Contributors", …). Each row is a value + label; the whole
 * array serialises into `cms.projects.impact_stats` (JSONB).
 */
export function ImpactEditor({ stats, onChange }: Props) {
  const update = (idx: number, patch: Partial<ImpactStat>) => {
    onChange(stats.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const remove = (idx: number) => {
    onChange(stats.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([...stats, { value: '', label: '' }]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Impact stats</span>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Add stat
        </Button>
      </div>

      {stats.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          No impact stats yet. Add short number + label pairs (e.g. &quot;820+ Contributors&quot;).
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {stats.map((s, idx) => (
            <li
              key={idx}
              className="grid grid-cols-[130px_1fr_auto] items-center gap-2 rounded-lg border border-border bg-card p-3"
            >
              <Input
                value={s.value}
                onChange={(e) => update(idx, { value: e.target.value })}
                placeholder="e.g. 35%"
                maxLength={40}
              />
              <Input
                value={s.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="e.g. To goal"
                maxLength={120}
                className="text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(idx)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove stat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
