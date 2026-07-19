'use client';

import { Badge, Checkbox, Input, ScrollArea } from '@shesa/ui';

interface AudienceSubListProps {
  readonly label: string;
  readonly query: string;
  readonly onQueryChange: (q: string) => void;
  readonly options: readonly { id: string; label: string }[];
  readonly selected: readonly string[];
  readonly emptyHint?: string;
  readonly onToggle: (id: string) => void;
}

/**
 * Search-and-checkbox sublist used inside the Location group's three
 * inner rows (Countries / Regions / Cities). Kept generic so it can
 * back any narrow "type-to-filter, multi-select" surface.
 */
export function AudienceSubList({
  label,
  query,
  onQueryChange,
  options,
  selected,
  emptyHint,
  onToggle,
}: AudienceSubListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {selected.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {selected.length}
          </Badge>
        )}
      </div>
      <Input
        type="search"
        placeholder={`Search ${label.toLowerCase()}…`}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="h-8 text-sm"
      />
      {options.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          {emptyHint ?? `No ${label.toLowerCase()} match.`}
        </p>
      ) : (
        <ScrollArea className="h-32 rounded-md border border-border">
          <div className="flex flex-col gap-1 p-2">
            {options.map((opt) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={selected.includes(opt.id)}
                  onCheckedChange={() => onToggle(opt.id)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
