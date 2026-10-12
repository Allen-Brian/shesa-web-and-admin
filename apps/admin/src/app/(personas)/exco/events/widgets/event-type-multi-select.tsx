'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

import { Badge, Checkbox, Popover, PopoverContent, PopoverTrigger } from '@shesa/ui';

import { EVENT_TYPES, type EventTypeValue } from './event-types-catalog';

interface EventTypeMultiSelectProps {
  readonly selected: readonly EventTypeValue[];
  readonly onToggle: (v: EventTypeValue) => void;
  readonly onRemove: (v: EventTypeValue) => void;
}

/**
 * Multi-select styled to look identical to shadcn's SelectTrigger.
 * Clicking opens a Popover with a scrollable checkbox list. Selected
 * values render as removable Badges below the trigger — same visual
 * pattern as the audience selector.
 */
const SELECT_TRIGGER_CLASS =
  'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-(--input-border) bg-transparent px-[11px] py-2 text-sm text-foreground ' +
  'transition-[border-color,box-shadow] hover:border-(--input-border-hover) ' +
  'focus:outline-none focus:border-(--input-border-hover) focus:shadow-(--input-focus-shadow) ' +
  'data-[state=open]:border-(--input-border-hover) data-[state=open]:shadow-(--input-focus-shadow)';

export function EventTypeMultiSelect({ selected, onToggle, onRemove }: EventTypeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? 'Select event types…'
      : selected.length === 1
        ? (EVENT_TYPES.find((t) => t.value === selected[0])?.label ?? '1 selected')
        : `${selected.length} types selected`;
  const isEmpty = selected.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={SELECT_TRIGGER_CLASS}>
            <span className={isEmpty ? 'text-muted-foreground' : ''}>{label}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-72 w-[--radix-popover-trigger-width] overflow-y-auto p-1"
        >
          <ul className="flex flex-col gap-0.5">
            {EVENT_TYPES.map((t) => {
              const active = selected.includes(t.value);
              return (
                <li key={t.value}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={active} onCheckedChange={() => onToggle(t.value)} />
                    <span>{t.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((v) => {
            const t = EVENT_TYPES.find((x) => x.value === v);
            return (
              <Badge key={v} variant="secondary" className="gap-1 pr-1 text-xs">
                <span>{t?.label ?? v}</span>
                <button
                  type="button"
                  onClick={() => onRemove(v)}
                  className="rounded-sm p-0.5 hover:bg-background"
                  aria-label={`Remove ${t?.label ?? v}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
