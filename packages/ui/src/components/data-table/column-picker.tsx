'use client';

import * as React from 'react';
import { Columns3 } from 'lucide-react';
import type { GridApi } from 'ag-grid-community';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';

/**
 * Toolbar dropdown that lists every column with a checkbox so a user can
 * restore a column they hid via HeadDrop. Closely listens to
 * `displayedColumnsChanged` + `gridColumnsChanged` so the checklist re-renders
 * the instant a column flips.
 */
export function ColumnPicker({ api }: { api: GridApi | null }) {
  const [, force] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    if (!api) return;
    const handler = () => force();
    api.addEventListener('displayedColumnsChanged', handler);
    api.addEventListener('gridColumnsChanged', handler);
    return () => {
      api.removeEventListener('displayedColumnsChanged', handler);
      api.removeEventListener('gridColumnsChanged', handler);
    };
  }, [api]);

  if (!api) return null;
  const cols = api.getColumns() ?? [];
  if (cols.length === 0) return null;

  const toggle = (colId: string, visible: boolean) => {
    api.applyColumnState({
      state: [{ colId, hide: !visible }],
      applyOrder: false,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:outline-none focus-visible:ring-0"
        >
          <Columns3 className="h-4 w-4" />
          Columns
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {cols.map((c) => {
          const colId = c.getColId();
          const visible = c.isVisible();
          const label = c.getColDef().headerName ?? colId;
          return (
            <DropdownMenuCheckboxItem
              key={colId}
              checked={visible}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(v) => toggle(colId, v)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
