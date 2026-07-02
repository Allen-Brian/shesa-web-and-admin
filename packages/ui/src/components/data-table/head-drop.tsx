'use client';

import * as React from 'react';
import type { ColumnPinnedEvent, IHeaderParams } from 'ag-grid-community';
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, ChevronUp, EyeOff, Pin, PinOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { cn } from '../../lib/cn';

/**
 * Custom header component rendered by AG Grid for every column. Click reveals a
 * shadcn dropdown menu with Pin/Unpin, Hide, Sort ascending, Sort descending —
 * the same set the Vue HeadDrop exposes. Sort state is mirrored from the column
 * via the `sortChanged` event so a tiny chevron next to the label reflects
 * the current sort direction (AG Grid's own sort indicator is hidden).
 */
export function HeadDrop(params: IHeaderParams) {
  const { displayName, column, api } = params;

  const [isPinned, setIsPinned] = React.useState<boolean>(!!column.isPinned());
  const [sort, setSort] = React.useState<'asc' | 'desc' | null>(
    (column.getSort() as 'asc' | 'desc' | null) ?? null,
  );

  React.useEffect(() => {
    const onPinned = (e: ColumnPinnedEvent) => {
      if (e.column && e.column.getColId() === column.getColId()) {
        setIsPinned(!!e.column.isPinned());
      }
    };
    const onSort = () => {
      setSort((column.getSort() as 'asc' | 'desc' | null) ?? null);
    };
    api.addEventListener('columnPinned', onPinned);
    api.addEventListener('sortChanged', onSort);
    return () => {
      api.removeEventListener('columnPinned', onPinned);
      api.removeEventListener('sortChanged', onSort);
    };
  }, [api, column]);

  const togglePin = () => {
    const colId = column.getColId();
    api.applyColumnState({
      state: [{ colId, pinned: column.isPinned() ? null : 'left' }],
      applyOrder: false,
    });
  };

  const hide = () => {
    api.applyColumnState({
      state: [{ colId: column.getColId(), hide: true }],
      applyOrder: false,
    });
  };

  const sortOnly = (direction: 'asc' | 'desc') => {
    const colId = column.getColId();
    const current = api.getColumnState();
    api.applyColumnState({
      state: current.map((s) => ({
        colId: s.colId,
        sort: s.colId === colId ? direction : null,
      })),
      applyOrder: false,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'group/headdrop -ml-2 flex h-10 items-center gap-2 rounded-md px-2 text-left transition-colors',
            'hover:bg-muted data-[state=open]:bg-muted',
            // Suppress the browser focus ring entirely — user-driven preference.
            'focus:outline-none focus-visible:outline-none focus-visible:ring-0',
          )}
        >
          <span className="text-xs font-medium uppercase tracking-wide">{displayName}</span>
          {sort === 'asc' && <ChevronUp className="h-3 w-3 text-foreground" />}
          {sort === 'desc' && <ChevronDown className="h-3 w-3 text-foreground" />}
          <ChevronDown
            className={cn(
              'h-3 w-3 opacity-0 transition-opacity',
              'group-hover/headdrop:opacity-60 group-data-[state=open]/headdrop:opacity-100',
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onSelect={togglePin}>
          {isPinned ? <PinOff /> : <Pin />}
          {isPinned ? 'Unpin' : 'Pin'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={hide}>
          <EyeOff />
          Hide
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => sortOnly('asc')}>
          <ArrowUpAZ />
          Sort ascending
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => sortOnly('desc')}>
          <ArrowDownAZ />
          Sort descending
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
