'use client';

import * as React from 'react';
import { Plus, Search } from 'lucide-react';
import type { GridApi } from 'ag-grid-community';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { ColumnPicker } from './data-table/column-picker';
import { PrivacyToggle } from './privacy';
import { Separator } from './separator';

interface Props {
  count: number;
  countLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  gridApi: GridApi | null;
  /// Hide the Create button entirely for read-only / system-seeded entities
  /// (cycles, awards). When false (default), the button renders and is
  /// disabled via `canCreate`.
  hideCreate?: boolean;
  canCreate: boolean;
  createLabel: string;
  onCreate: () => void;
  /// Optional "Show only active" filter rendered inline between search
  /// and the right-side controls. Pass both `showActiveOnly` and
  /// `onShowActiveOnlyChange` to enable. Omit to hide.
  showActiveOnly?: boolean;
  onShowActiveOnlyChange?: (next: boolean) => void;
  showActiveLabel?: string;
  /// Optional slot for table-level filters (eg. Faculty Select on the
  /// Targets tab). Rendered between the search input and the right-side
  /// controls so the table inherits a single, consistent header bar.
  filters?: React.ReactNode;
  /// Optional slot for table-level actions (eg. Export). Sits beside the
  /// Columns picker, left of Create, so every table puts the same kind of
  /// control in the same place.
  actions?: React.ReactNode;
}

/**
 * Pill-shaped header above every structure-entity table.
 *   `N {label}` · divider · borderless search   …   [show active]  Columns · Add New
 * The Columns picker is wired to the live grid api so toggling visibility
 * stays in sync with the table below.
 */
export function EntityTablePanel({
  count,
  countLabel,
  search,
  onSearchChange,
  gridApi,
  hideCreate = false,
  canCreate,
  createLabel,
  onCreate,
  showActiveOnly,
  onShowActiveOnlyChange,
  showActiveLabel = 'Show only active',
  filters,
  actions,
}: Props) {
  const showActiveSlotEnabled =
    showActiveOnly !== undefined && onShowActiveOnlyChange !== undefined;
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border bg-card px-2 py-2">
      <div className="flex flex-1 items-center gap-3 ml-2">
        <span className="whitespace-nowrap text-sm font-medium text-foreground">
          {count} {countLabel}
        </span>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {filters}
        {filters && <Separator orientation="vertical" className="h-6" />}
        {showActiveSlotEnabled && (
          <>
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={showActiveOnly}
                onCheckedChange={(v) => onShowActiveOnlyChange(Boolean(v))}
              />
              {showActiveLabel}
            </label>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        {actions}
        {/* Renders itself only under a PrivacyProvider, so tables on
            surfaces without a presentation mode are unaffected. */}
        <PrivacyToggle />
        <ColumnPicker api={gridApi} />
        {!hideCreate && (
          <Button size="sm" disabled={!canCreate} onClick={onCreate}>
            <Plus size={14} />
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
