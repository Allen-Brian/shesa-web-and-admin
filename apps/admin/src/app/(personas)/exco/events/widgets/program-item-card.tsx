'use client';

import { ArrowDown, ArrowUp, Clock, Trash2 } from 'lucide-react';

import { Button, Input, Textarea, TimePicker } from '@shesa/ui';

export interface ProgramItem {
  readonly id: string;
  readonly startsAt: string; // "HH:mm"
  readonly title: string;
  readonly detail: string;
}

interface ProgramItemCardProps {
  readonly index: number;
  readonly total: number;
  readonly item: ProgramItem;
  readonly onChange: (patch: Partial<Omit<ProgramItem, 'id'>>) => void;
  readonly onMove: (delta: -1 | 1) => void;
  readonly onRemove: () => void;
}

/**
 * One agenda row inside the event Program card.
 *
 * Layout: number chip · title input (borderless — no focus outline
 * either, per user request) · reorder + remove actions on the right.
 * Below: time picker + optional detail textarea in a two-column grid
 * that stacks on narrow widths.
 */
export function ProgramItemCard({
  index,
  total,
  item,
  onChange,
  onMove,
  onRemove,
}: ProgramItemCardProps) {
  const num = index + 1;
  return (
    <div className="group flex flex-col gap-2 rounded-lg border border-border bg-card/60 p-3 transition-colors hover:border-border hover:bg-card">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {num}
        </span>
        <div className="min-w-0 flex-1">
          <Input
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={`Item ${num} — e.g. "Opening Remarks"`}
            maxLength={200}
            className="border-0 bg-transparent px-0 text-sm font-medium shadow-none outline-none focus:border-0 focus:shadow-none focus:outline-none focus-visible:border-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
        <div className="relative">
          <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <TimePicker
            value={item.startsAt}
            onChange={(v) => onChange({ startsAt: v })}
            placeholder="Time"
            className="pl-8 text-sm"
          />
        </div>
        <Textarea
          value={item.detail}
          onChange={(e) => onChange({ detail: e.target.value })}
          placeholder="Optional details for this session"
          rows={1}
          className="min-h-9 resize-none text-sm"
        />
      </div>
    </div>
  );
}
