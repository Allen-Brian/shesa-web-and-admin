'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronsUpDown, X } from 'lucide-react';

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@shesa/ui';

import type { LinkableEvent } from './gallery-widget-types';

interface Props {
  readonly events: readonly LinkableEvent[];
  readonly value: string | null;
  readonly onChange: (nextEventId: string | null) => void;
}

/**
 * Searchable dropdown of `cms.site_events`. Linking an album to an
 * event powers the "View album" button on the event detail page and
 * the "View event" link on the album detail page.
 */
export function EventLinker({ events, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => events.find((e) => e.id === value) ?? null, [events, value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Linked event</span>
        {selected && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
            Unlink
          </Button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {selected ? (
                <span className="truncate">{selected.title}</span>
              ) : (
                <span className="text-muted-foreground">Not linked to any event</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search events…" />
            <CommandList>
              <CommandEmpty>No events found.</CommandEmpty>
              <CommandGroup>
                {events.map((e) => {
                  const isOn = e.id === value;
                  return (
                    <CommandItem
                      key={e.id}
                      value={`${e.title} ${e.slug}`}
                      onSelect={() => {
                        onChange(isOn ? null : e.id);
                        setOpen(false);
                      }}
                    >
                      <Check className={`h-3.5 w-3.5 ${isOn ? 'opacity-100' : 'opacity-0'}`} />
                      <div className="flex flex-col">
                        <span className="text-sm">{e.title}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(e.startsAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {' · '}
                          {e.slug}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="text-[11px] text-muted-foreground">
        Linking an album to an event shows a “View album” button on the event page.
      </p>
    </div>
  );
}
