'use client';

import { GripVertical, Plus, Trash2 } from 'lucide-react';

import { Button, Input, Textarea } from '@shesa/ui';

import type { ProgramItem } from './site-event-widget-types';

interface Props {
  readonly program: readonly ProgramItem[];
  readonly onChange: (next: readonly ProgramItem[]) => void;
}

/**
 * Ordered schedule editor for a featured event. Each row: a short
 * time label, a title, and an optional description. Rows can be
 * reordered and removed. The whole list is serialised into
 * `cms.site_events.program` (JSONB) on save.
 */
export function ProgramEditor({ program, onChange }: Props) {
  const update = (idx: number, patch: Partial<ProgramItem>) => {
    onChange(program.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const remove = (idx: number) => {
    onChange(program.filter((_, i) => i !== idx));
  };

  const move = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= program.length) return;
    const next = [...program];
    const item = next[idx]!;
    next[idx] = next[target]!;
    next[target] = item;
    onChange(next);
  };

  const add = () => {
    onChange([...program, { time: '', title: '', description: '' }]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Programme</span>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Add slot
        </Button>
      </div>

      {program.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          No programme yet. Add each session in chronological order.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {program.map((m, idx) => (
            <li
              key={idx}
              className="grid grid-cols-[24px_100px_1fr_auto] items-start gap-2 rounded-lg border border-border bg-card p-3"
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
                  disabled={idx === program.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  <GripVertical className="h-4 w-4 rotate-180" />
                </button>
              </div>
              <Input
                value={m.time}
                onChange={(e) => update(idx, { time: e.target.value })}
                placeholder="e.g. 09:00"
                maxLength={20}
                className="text-xs"
              />
              <div className="flex flex-col gap-1.5">
                <Input
                  value={m.title}
                  onChange={(e) => update(idx, { title: e.target.value })}
                  placeholder="Session title"
                  maxLength={200}
                />
                <Textarea
                  value={m.description ?? ''}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  placeholder="Description (optional)"
                  maxLength={400}
                  rows={2}
                  className="text-xs"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(idx)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove slot"
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
