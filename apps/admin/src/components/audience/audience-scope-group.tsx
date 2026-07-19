'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

import {
  Badge,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Separator,
} from '@shesa/ui';

import type { AudienceOption } from './audience-selector-types';

interface AudienceScopeGroupProps {
  readonly title: string;
  readonly description: string;
  readonly mode: 'all' | 'specific';
  readonly selectedIds: readonly string[];
  readonly options: readonly AudienceOption[];
  readonly onModeChange: (mode: 'all' | 'specific') => void;
  readonly onSelectionChange: (ids: string[]) => void;
}

/**
 * Collapsible group with an All / Specific radio, selected chips, a
 * search input, and a scrollable checkbox list. Used for Membership,
 * Houses, Networks, Batches — every "flat list of scopes" dimension.
 */
export function AudienceScopeGroup({
  title,
  description,
  mode,
  selectedIds,
  options,
  onModeChange,
  onSelectionChange,
}: AudienceScopeGroupProps) {
  const [query, setQuery] = useState('');
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const idToLabel = useMemo(() => new Map(options.map((o) => [o.id, o.label])), [options]);
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter((s) => s !== id));
    else onSelectionChange([...selectedIds, id]);
  };
  const removeChip = (id: string) => onSelectionChange(selectedIds.filter((s) => s !== id));

  return (
    <Collapsible defaultOpen={false} className="rounded-md border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {mode === 'specific' && selectedIds.length > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {selectedIds.length}
            </Badge>
          )}
          {mode === 'all' && (
            <Badge variant="outline" className="text-xs font-normal">
              All
            </Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border px-3 py-3">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{description}</p>

          <RadioGroup
            value={mode}
            onValueChange={(v) => onModeChange(v as 'all' | 'specific')}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id={`${title}-all`} />
              <Label htmlFor={`${title}-all`} className="text-sm font-normal">
                All
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="specific" id={`${title}-specific`} />
              <Label htmlFor={`${title}-specific`} className="text-sm font-normal">
                Specific
              </Label>
            </div>
          </RadioGroup>

          {mode === 'specific' && (
            <>
              {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedIds.map((id) => (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      <span className="text-xs">{idToLabel.get(id) ?? id}</span>
                      <button
                        type="button"
                        onClick={() => removeChip(id)}
                        className="rounded-sm p-0.5 hover:bg-background"
                        aria-label={`Remove ${idToLabel.get(id) ?? id}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <Input
                type="search"
                placeholder={`Search ${title.toLowerCase()}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 text-sm"
              />

              <Separator />

              {filteredOptions.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">No matches.</p>
              ) : (
                <ScrollArea className="h-40 rounded-md border border-border">
                  <div className="flex flex-col gap-1 p-2">
                    {filteredOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedIds.includes(opt.id)}
                          onCheckedChange={() => toggle(opt.id)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
