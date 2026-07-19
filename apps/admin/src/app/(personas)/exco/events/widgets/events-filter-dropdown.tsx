'use client';

import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';

import { Button, Popover, PopoverContent, PopoverTrigger, Separator } from '@shesa/ui';

import { EventsFilterDimensionItem } from './events-filter-dimension-item';
import { EventsFilterValueRow } from './events-filter-value-row';
import { EVENT_TYPE_OPTIONS, MODE_OPTIONS } from './list-constants';
import type { ModeFilter } from './list-types';

interface EventsFilterDropdownProps {
  readonly modeValue: ModeFilter;
  readonly typeValues: readonly string[];
  readonly activeCount: number;
  readonly onApply: (mode: ModeFilter, types: readonly string[]) => void;
  readonly onClearAll: () => void;
}

type Dim = 'mode' | 'type';

/**
 * Two-pane filter dropdown for Events — same shape as the shared Members
 * FilterDropdown (category list on the left, value list on the right).
 * Values commit to the parent on Apply; Reset clears everything.
 */
export function EventsFilterDropdown({
  modeValue,
  typeValues,
  activeCount,
  onApply,
  onClearAll,
}: EventsFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [selectedDim, setSelectedDim] = useState<Dim>('mode');
  const [draftMode, setDraftMode] = useState<ModeFilter>(modeValue);
  const [draftTypes, setDraftTypes] = useState<readonly string[]>(typeValues);

  useEffect(() => {
    if (open) {
      setDraftMode(modeValue);
      setDraftTypes(typeValues);
    }
  }, [open, modeValue, typeValues]);

  const apply = () => {
    onApply(draftMode, draftTypes);
    setOpen(false);
  };

  const reset = () => {
    setDraftMode('all');
    setDraftTypes([]);
    onClearAll();
    setOpen(false);
  };

  const toggleType = (v: string) =>
    setDraftTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-sm">
          <Filter className="h-3.5 w-3.5" />
          Filter
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-130 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filters
          </span>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>
              Reset
            </Button>
            <Button type="button" size="sm" className="h-7 text-xs" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>

        <div className="flex min-h-60">
          <ul className="flex w-40 flex-col gap-0.5 border-r border-border p-1.5">
            <EventsFilterDimensionItem
              label="Mode"
              active={selectedDim === 'mode'}
              activeCount={draftMode === 'all' ? 0 : 1}
              onSelect={() => setSelectedDim('mode')}
            />
            <EventsFilterDimensionItem
              label="Event type"
              active={selectedDim === 'type'}
              activeCount={draftTypes.length}
              onSelect={() => setSelectedDim('type')}
            />
          </ul>

          <Separator orientation="vertical" />

          <ul className="flex-1 overflow-y-auto p-1.5">
            {selectedDim === 'mode' && (
              <>
                <EventsFilterValueRow
                  label="All modes"
                  active={draftMode === 'all'}
                  onClick={() => setDraftMode('all')}
                />
                {MODE_OPTIONS.map((m) => (
                  <EventsFilterValueRow
                    key={m.value}
                    label={m.label}
                    active={draftMode === m.value}
                    onClick={() => setDraftMode(m.value)}
                  />
                ))}
              </>
            )}
            {selectedDim === 'type' &&
              EVENT_TYPE_OPTIONS.map((t) => (
                <EventsFilterValueRow
                  key={t.value}
                  label={t.label}
                  active={draftTypes.includes(t.value)}
                  onClick={() => toggleType(t.value)}
                  checkbox
                />
              ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
