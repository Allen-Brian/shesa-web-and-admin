'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EntityTablePanel,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';

export type ScopeStatus = 'active' | 'inactive' | 'archived';

export interface ClusterRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly created_at: string;
  readonly [key: string]: unknown;
}

interface ClusterListProps<T extends ClusterRow> {
  readonly data: readonly T[];
  readonly columnDefs: ColDef<T>[];
  readonly entitySingular: string;
  readonly entityPlural: string;
  readonly basePath: string;
  readonly canCreate?: boolean;
  readonly createLabel?: string;
}

/**
 * Reusable list view for every cluster page (branches, batches,
 * professional networks, houses). Wraps `EntityTablePanel` above a
 * `DataTable`, appends a right-pinned row-actions column, and navigates
 * to `${basePath}/${row.id}` on row click.
 */
export function ClusterList<T extends ClusterRow>({
  data,
  columnDefs,
  entitySingular,
  entityPlural,
  basePath,
  canCreate = true,
  createLabel,
}: ClusterListProps<T>) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null);
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((row) => {
      if (showActiveOnly && row.status !== 'active') return false;
      if (!q) return true;
      return row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q);
    });
  }, [data, search, showActiveOnly]);

  const columnsWithActions = useMemo<ColDef<T>[]>(
    () => [
      ...columnDefs,
      {
        headerName: 'Action',
        colId: 'actions',
        pinned: 'right',
        sortable: false,
        filter: false,
        suppressMovable: true,
        width: 90,
        minWidth: 90,
        maxWidth: 90,
        cellRenderer: (params: ICellRendererParams<T>) =>
          params.data ? <RowActions row={params.data} /> : null,
      },
    ],
    [columnDefs],
  );

  const handleCreate = useCallback(() => {
    toast.info(`Add ${entitySingular} coming soon`);
  }, [entitySingular]);

  const handleRowClicked = useCallback(
    (e: RowClickedEvent<T>) => {
      if (!e.data) return;
      router.push(`${basePath}/${e.data.id}`);
    },
    [basePath, router],
  );

  const massActions = useMemo<MassActions<T>>(
    () => ({
      itemName: entitySingular,
      pluralItemName: entityPlural,
      onArchive: (selected) => toast.info(`Archive ${selected.length} ${entityPlural} coming soon`),
      onExport: (selected) => toast.info(`Export ${selected.length} ${entityPlural} coming soon`),
      onDelete: (selected) => toast.info(`Delete ${selected.length} ${entityPlural} coming soon`),
    }),
    [entitySingular, entityPlural],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={entityPlural}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        onCreate={handleCreate}
        createLabel={createLabel ?? `Add ${capitalize(entitySingular)}`}
        showActiveOnly={showActiveOnly}
        onShowActiveOnlyChange={setShowActiveOnly}
      />
      <DataTable<T>
        rowData={filtered as T[]}
        columnDefs={columnsWithActions}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={handleRowClicked}
        showColumnPicker={false}
        massActions={massActions}
      />
    </div>
  );
}

function RowActions({ row }: { row: ClusterRow }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-md p-0"
          aria-label="Row actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => toast.info(`Edit ${row.name}`)}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info(`Archive ${row.name}`)}>
          <Archive className="h-4 w-4" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => toast.info(`Delete ${row.name}`)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Cell renderer helper for the shared "Status" column across cluster pages. */
export function StatusBadge({ status }: { status: ScopeStatus }) {
  const styles: Record<ScopeStatus, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    inactive: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    archived: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  };
  const label: Record<ScopeStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    archived: 'Archived',
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {label[status]}
    </Badge>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
