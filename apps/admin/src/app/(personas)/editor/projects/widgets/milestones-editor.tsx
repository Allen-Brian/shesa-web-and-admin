'use client';

import { GripVertical, Plus, Trash2 } from 'lucide-react';

import { Button, Checkbox, Input, Textarea } from '@shesa/ui';

import type { Milestone } from './project-widget-types';

interface Props {
  readonly milestones: readonly Milestone[];
  readonly onChange: (next: readonly Milestone[]) => void;
}

/**
 * Inline editor for the project's ordered milestones list. Each row
 * carries a date label, title, optional body, and a done checkbox.
 * Rows can be added, removed, and reordered. The whole array is
 * serialised into `cms.projects.milestones` (JSONB) on save.
 */
export function MilestonesEditor({ milestones, onChange }: Props) {
  const update = (idx: number, patch: Partial<Milestone>) => {
    onChange(milestones.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const remove = (idx: number) => {
    onChange(milestones.filter((_, i) => i !== idx));
  };

  const move = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= milestones.length) return;
    const next = [...milestones];
    const item = next[idx]!;
    next[idx] = next[target]!;
    next[target] = item;
    onChange(next);
  };

  const add = () => {
    onChange([...milestones, { date: '', title: '', body: '', done: false }]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Milestones</span>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Add milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          No milestones yet. Add key dates or phases the public timeline should show.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {milestones.map((m, idx) => (
            <li
              key={idx}
              className="grid grid-cols-[24px_140px_1fr_120px_auto] items-start gap-2 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === milestones.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  <GripVertical className="h-4 w-4 rotate-180" />
                </button>
              </div>
              <Input
                value={m.date}
                onChange={(e) => update(idx, { date: e.target.value })}
                placeholder="e.g. Jan 2024"
                maxLength={40}
                className="text-xs"
              />
              <div className="flex flex-col gap-1.5">
                <Input
                  value={m.title}
                  onChange={(e) => update(idx, { title: e.target.value })}
                  placeholder="Title"
                  maxLength={200}
                />
                <Textarea
                  value={m.body ?? ''}
                  onChange={(e) => update(idx, { body: e.target.value })}
                  placeholder="Body (optional)"
                  maxLength={400}
                  rows={2}
                  className="text-xs"
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={m.done}
                  onCheckedChange={(v) => update(idx, { done: v === true })}
                />
                Done
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(idx)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove milestone"
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
