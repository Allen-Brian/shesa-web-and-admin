'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X, type LucideIcon } from 'lucide-react';

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

/**
 * A searchable "link this to one of those" control.
 *
 * Three surfaces need the same thing — an album picks an event, an album
 * picks an organ, an organ picks an album — and the only differences are
 * the words and the icon. The first of them, `EventLinker`, was written
 * before the other two existed; copying it twice more is exactly how the
 * sixteen near-identical category editors happened, so it is
 * parameterised instead.
 *
 * Everything specific stays with the caller: each surface keeps a thin
 * wrapper that knows how to turn its own rows into options and what to
 * call the relationship.
 */
export interface LinkableOption {
  readonly id: string;
  readonly label: string;
  /** Second line — a date, a slug, a place. Disambiguates same-named rows. */
  readonly hint?: string | null;
  /** Extra text the search should match but the list need not show. */
  readonly search?: string;
}

interface Props {
  /** "Linked event", "Linked album". */
  readonly title: string;
  readonly options: readonly LinkableOption[];
  readonly value: string | null;
  readonly onChange: (nextId: string | null) => void;
  readonly icon: LucideIcon;
  /** Shown on the trigger when nothing is linked. */
  readonly placeholder: string;
  readonly searchPlaceholder: string;
  readonly emptyText: string;
  /** One line under the control explaining what the link does. */
  readonly help?: string;
}

export function EntityLinker({
  title,
  options,
  value,
  onChange,
  icon: Icon,
  placeholder,
  searchPlaceholder,
  emptyText,
  help,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{title}</span>
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
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              {selected ? (
                <span className="truncate">{selected.label}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isOn = option.id === value;
                  return (
                    <CommandItem
                      key={option.id}
                      // Selecting the linked one again unlinks it, so the
                      // control can be undone without hunting for Unlink.
                      value={`${option.label} ${option.search ?? ''}`}
                      onSelect={() => {
                        onChange(isOn ? null : option.id);
                        setOpen(false);
                      }}
                    >
                      <Check className={`h-3.5 w-3.5 ${isOn ? 'opacity-100' : 'opacity-0'}`} />
                      <div className="flex flex-col">
                        <span className="text-sm">{option.label}</span>
                        {option.hint && (
                          <span className="text-[11px] text-muted-foreground">{option.hint}</span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}
