'use client';

import { GripVertical, Plus, Trash2 } from 'lucide-react';

import { Button, Input, Textarea } from '@shesa/ui';

import type { ProgramItem } from './site-event-widget-types';

interface Props {
  readonly program: readonly ProgramItem[];
  readonly onChange: (next: readonly ProgramItem[]) => void;
  /**
   * The event's own start and end (YYYY-MM-DD), used to bound the day
   * picker so a slot cannot be dated outside the event it belongs to.
   */
  readonly dayRange?: { readonly min?: string; readonly max?: string };
}

/**
 * Ordered schedule editor for a featured event. Each row: a short
 * time label, a title, and an optional description. Rows can be
 * reordered and removed. The whole list is serialised into
 * `cms.site_events.program` (JSONB) on save.
 */
export function ProgramEditor({ program, onChange, dayRange }: Props) {
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
    // A new slot inherits the day above it — a multi-day programme is
    // mostly consecutive sessions on the same date.
    const lastDay = program.length > 0 ? (program[program.length - 1]?.day ?? '') : '';
    onChange([...program, { day: lastDay, time: '', title: '', description: '' }]);
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
          No programme yet. Add each session in order; set the day on each slot when the event runs
          over more than one.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {program.map((m, idx) => (
            <li
              key={idx}
              className="grid grid-cols-[24px_150px_1fr_auto] items-start gap-2 rounded-lg border border-border bg-card p-3"
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
              {/* Day then time: an event that runs Friday to Sunday needs
                  each slot pinned to a date, not just a clock reading. The
                  date is optional — leave it blank on a single-day
                  programme and the public page shows one undated run. */}
              <div className="flex flex-col gap-1.5">
                <Input
                  type="date"
                  value={m.day ?? ''}
                  onChange={(e) => update(idx, { day: e.target.value })}
                  min={dayRange?.min}
                  max={dayRange?.max}
                  className="text-xs"
                  aria-label="Day"
                />
                <Input
                  value={m.time}
                  onChange={(e) => update(idx, { time: e.target.value })}
                  placeholder="e.g. 09:00"
                  maxLength={20}
                  className="text-xs"
                  aria-label="Time"
                />
              </div>
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
