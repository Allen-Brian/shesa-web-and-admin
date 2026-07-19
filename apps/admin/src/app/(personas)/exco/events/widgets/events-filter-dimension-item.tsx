'use client';

import { ChevronRight } from 'lucide-react';

import { cn } from '@shesa/ui';

interface EventsFilterDimensionItemProps {
  readonly label: string;
  readonly active: boolean;
  readonly activeCount: number;
  readonly onSelect: () => void;
}

export function EventsFilterDimensionItem({
  label,
  active,
  activeCount,
  onSelect,
}: EventsFilterDimensionItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'group flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors',
          active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60',
        )}
      >
        <span className="flex items-center gap-2">
          {label}
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0 text-[10px] font-medium text-primary">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-70" />
      </button>
    </li>
  );
}
