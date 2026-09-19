'use client';

import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridApi,
  type GridOptions,
  type GridReadyEvent,
  type RowClickedEvent,
  type SelectionChangedEvent,
} from 'ag-grid-community';
import { cn } from '../../lib/cn';
import { HeadDrop } from './head-drop';
import { ColumnPicker } from './column-picker';
import { TableSkeleton } from './table-skeleton';
import { TablePagination } from './table-pagination';
import { MassActionsBar, type MassActions } from './mass-actions';
import { shesaTableTheme } from './theme';

// One-shot module registration — AG Grid v33 requires modules to be registered
// before the first grid renders. AllCommunityModule pulls in client-side row
// model + sort/filter + checkbox selection (everything we need for admin lists).
ModuleRegistry.registerModules([AllCommunityModule]);

export type DataTableVariant = 'basic' | 'border';

export interface DataTableProps<T = unknown> extends Omit<
  GridOptions<T>,
  'columnDefs' | 'rowData' | 'theme' | 'pagination'
> {
  columnDefs: ColDef<T>[];
  rowData: T[] | undefined;
  /** When true (or rowData is undefined), render `<TableSkeleton>` instead. */
  loading?: boolean;
  /** "basic" = no outer ring; "border" = 1px ring + rounded corners + subtle header bg. */
  variant?: DataTableVariant;
  rowHeight?: number;
  headerHeight?: number;
  /** Fires on row click. Suppressed for clicks inside the selection-checkbox column. */
  onRowClicked?: (e: RowClickedEvent<T>) => void;
  className?: string;
  /** Show the built-in toolbar with the Columns picker. Default true. */
  showColumnPicker?: boolean;
  /** Slot rendered on the left of the toolbar (custom actions, search input, etc.). */
  toolbar?: React.ReactNode;
  /**
   * Stable id getter. Pass this when rowData reloads frequently (polling) so
   * AG Grid can diff in place rather than re-mount rows.
   */
  getRowId?: GridOptions<T>['getRowId'];
  /** Prepend a checkbox column for row selection + show MassActionsBar on selection. */
  selectable?: boolean;
  /**
   * Freeze the checkbox column to the left edge. Default true, which is what
   * a wide table with horizontal scroll wants — the checkbox stays reachable
   * while the columns slide under it. Pass false on a table that fits, where
   * a frozen column only adds a seam.
   */
  selectionPinned?: boolean;
  /** Wired actions for the bottom popup when one or more rows are selected. */
  massActions?: MassActions<T>;
  /** Pagination on/off. Default true. */
  pagination?: boolean;
  /** Initial page size. Default 10. */
  pageSize?: number;
  /** Page-size dropdown options. Default `[10, 25, 50, 100]`. */
  pageSizeOptions?: number[];
  /**
   * Size the table to its content (header + visible rows) instead of filling
   * the parent. Use for embedded tables inside dashboard cards or sections —
   * the primary admin list pages stay on the default fill-height behaviour.
   */
  autoHeight?: boolean;
}

/**
 * Academia-themed AG Grid table. Defaults: HeadDrop on every header, Column
 * picker toolbar, vertically-centered cells, no column resize, paginated.
 * Pass `selectable + massActions` to enable the checkbox column + slide-up
 * Delete/Export popup; pass `onRowClicked` for row navigation (clicks inside
 * the selection column are suppressed so they don't trigger navigation).
 */
export function DataTable<T>({
  columnDefs,
  rowData,
  loading,
  variant = 'basic',
  rowHeight = 65,
  headerHeight = 48,
  onRowClicked,
  className,
  showColumnPicker = true,
  toolbar,
  getRowId,
  defaultColDef,
  selectable = true,
  selectionPinned = true,
  massActions,
  pagination = true,
  pageSize: pageSizeProp = 8,
  pageSizeOptions = [4, 6, 8, 16, 24, 32],
  autoHeight = false,
  ...rest
}: DataTableProps<T>) {
  const [api, setApi] = React.useState<GridApi<T> | null>(null);
  const [pageSize, setPageSize] = React.useState(pageSizeProp);
  const [selected, setSelected] = React.useState<T[]>([]);

  const onGridReady = React.useCallback(
    (e: GridReadyEvent<T>) => {
      setApi(e.api);
      rest.onGridReady?.(e);
    },
    [rest],
  );

  const onSelectionChanged = React.useCallback(
    (e: SelectionChangedEvent<T>) => {
      setSelected(e.api.getSelectedRows());
      rest.onSelectionChanged?.(e);
      // Drop focus off the checkbox so the ring doesn't linger after a
      // mouse click. Keyboard users are unaffected — their `:focus-visible`
      // ring returns on the next Tab press.
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest('.ag-checkbox-input-wrapper')) {
        active.blur();
      }
    },
    [rest],
  );

  // Skip row-click navigation when the click came from the selection-checkbox
  // column or the column-picker's checkbox — otherwise toggling selection would
  // navigate away from the page.
  const handleRowClicked = React.useCallback(
    (e: RowClickedEvent<T>) => {
      if (!onRowClicked) return;
      const target = e.event?.target as HTMLElement | undefined;
      if (
        target?.closest(
          '.ag-checkbox, .ag-checkbox-input-wrapper, .ag-selection-checkbox, input[type="checkbox"], label, button, a, [role="button"], [role="menuitem"], [role="switch"]',
        )
      ) {
        return;
      }
      onRowClicked(e);
    },
    [onRowClicked],
  );

  const mergedDefaultColDef = React.useMemo<ColDef<T>>(
    () => ({
      minWidth: 120,
      sortable: true,
      resizable: false,
      headerComponent: HeadDrop,
      suppressHeaderMenuButton: true,
      // Vertically-center every cell's content. AG Grid's Quartz cells default
      // to inline layout, so multi-line cellRenderers (e.g. name + subtitle)
      // stick to the top of the 65px row — this normalises the baseline
      // across every admin table without each caller having to opt in.
      cellStyle: { display: 'flex', alignItems: 'center' },
      ...defaultColDef,
    }),
    [defaultColDef],
  );

  const showingSkeleton = loading || rowData === undefined;
  const hasToolbar = !!toolbar || showColumnPicker;

  return (
    <div className={cn('flex w-full flex-col gap-2', !autoHeight && 'min-h-0 flex-1', className)}>
      {hasToolbar && (
        <div className="flex h-9 shrink-0 items-center justify-between gap-2">
          <div className="flex-1">{toolbar}</div>
          {showColumnPicker && !showingSkeleton && <ColumnPicker api={api} />}
        </div>
      )}

      {showingSkeleton ? (
        <TableSkeleton
          rows={pageSize}
          columns={columnDefs.length + (selectable ? 1 : 0)}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          variant={variant}
        />
      ) : (
        <div className={cn('relative flex flex-col', !autoHeight && 'min-h-0 flex-1')}>
          <div
            className={cn(
              'w-full',
              !autoHeight && 'min-h-0 flex-1',
              variant === 'border' && 'overflow-hidden rounded-xl border border-border bg-card',
              onRowClicked && '[&_.ag-row]:cursor-pointer',
            )}
          >
            <AgGridReact<T>
              theme={shesaTableTheme}
              columnDefs={columnDefs}
              rowData={rowData}
              defaultColDef={mergedDefaultColDef}
              rowHeight={rowHeight}
              headerHeight={headerHeight}
              domLayout={autoHeight ? 'autoHeight' : 'normal'}
              suppressCellFocus
              suppressMovableColumns={false}
              getRowId={getRowId}
              pagination={pagination}
              paginationPageSize={pageSize}
              paginationPageSizeSelector={false}
              suppressPaginationPanel
              rowSelection={
                selectable
                  ? {
                      mode: 'multiRow',
                      enableClickSelection: false,
                      checkboxes: true,
                      headerCheckbox: true,
                    }
                  : undefined
              }
              selectionColumnDef={
                selectable
                  ? {
                      width: 50,
                      maxWidth: 50,
                      pinned: selectionPinned ? 'left' : undefined,
                      suppressHeaderMenuButton: true,
                      headerComponent: undefined,
                    }
                  : undefined
              }
              {...rest}
              onSelectionChanged={onSelectionChanged}
              onRowClicked={handleRowClicked}
              onGridReady={onGridReady}
            />
          </div>

          {selectable && massActions && (
            <MassActionsBar selected={selected} actions={massActions} />
          )}

          {pagination && (
            <div className="shrink-0 px-1 pt-2">
              <TablePagination
                api={api}
                pageSize={pageSize}
                pageSizeOptions={pageSizeOptions}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  api?.setGridOption('paginationPageSize', size);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { MassActions };
