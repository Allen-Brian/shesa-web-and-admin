'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
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

import { NetworkIcon } from '@/components/networks/icon-picker';
import type { ScopeStatus } from '@/components/clusters/cluster-list';

import { archiveNetwork } from '../actions';
import { NetworkFormDialog } from './form-dialog';
import type { NetworkInitialValues } from './form';

export interface NetworkRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly short_name: string;
  readonly description: string | null;
  readonly icon: string | null;
  readonly color_hex: string | null;
  readonly sort_order: number;
  readonly member_count: number;
  readonly [key: string]: unknown;
}

type SerialRow = NetworkRow & { readonly serial: number };

type ConfirmState = null | {
  readonly kind: 'archive' | 'delete';
  readonly targets: readonly SerialRow[];
};

interface NetworksListViewProps {
  readonly data: readonly NetworkRow[];
  readonly canCreate: boolean;
}

export function NetworksListView({ data, canCreate }: NetworksListViewProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [dialogState, setDialogState] = useState<
    | { readonly mode: 'create' }
    | { readonly mode: 'edit'; readonly initial: NetworkInitialValues }
    | null
  >(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  // Stable S/N assigned before search filters — a row keeps its number
  // even when it drops out of the current search result.
  const numbered = useMemo<readonly SerialRow[]>(
    () => data.map((r, i) => ({ ...r, serial: i + 1 })),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.short_name.toLowerCase().includes(q)) return true;
      if (r.description?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [numbered, search]);

  const openCreate = () => setDialogState({ mode: 'create' });
  const openEdit = (row: NetworkRow) =>
    setDialogState({
      mode: 'edit',
      initial: {
        scopeId: row.id,
        name: row.name,
        slug: row.slug,
        shortName: row.short_name,
        description: row.description,
        icon: row.icon,
        colorHex: row.color_hex,
        sortOrder: row.sort_order,
      },
    });

  const runArchive = (targets: readonly SerialRow[], kind: 'archive' | 'delete') => {
    startTransition(async () => {
      const results = await Promise.all(targets.map((t) => archiveNetwork(t.id)));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(
          `${kind === 'archive' ? 'Archived' : 'Deleted'} ${targets.length} network${
            targets.length === 1 ? '' : 's'
          }.`,
        );
      } else if (failed.length === targets.length) {
        toast.error(failed[0]?.message ?? `Could not ${kind}.`);
      } else {
        toast.error(
          `${kind === 'archive' ? 'Archived' : 'Deleted'} ${
            targets.length - failed.length
          }; ${failed.length} failed.`,
        );
      }
      router.refresh();
    });
  };

  const columnDefs = useMemo<ColDef<SerialRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 72,
        maxWidth: 72,
        sortable: false,
        filter: false,
        suppressMovable: true,
      },
      {
        headerName: 'Logo',
        colId: 'chip',
        width: 70,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<SerialRow>) =>
          params.data ? (
            <NetworkChip color={params.data.color_hex} icon={params.data.icon} />
          ) : null,
      },
      {
        headerName: 'Network',
        field: 'name',
        flex: 2,
        minWidth: 200,
      },
      {
        headerName: 'Short name',
        field: 'short_name',
        flex: 1.5,
        minWidth: 140,
      },
      {
        headerName: 'Description',
        field: 'description',
        flex: 3,
        minWidth: 240,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Members',
        field: 'member_count',
        width: 120,
        cellClass: 'text-center',
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 130,
        cellRenderer: (params: ICellRendererParams<SerialRow, ScopeStatus>) => (
          <NetworkStatusBadge status={params.value ?? 'active'} />
        ),
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 100,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<SerialRow>) =>
          params.data ? (
            <RowActions
              row={params.data}
              onEdit={openEdit}
              onArchive={(r) => setConfirm({ kind: 'archive', targets: [r] })}
              onDelete={(r) => setConfirm({ kind: 'delete', targets: [r] })}
            />
          ) : null,
      },
    ],
    [],
  );

  const handleRowClicked = (e: RowClickedEvent<SerialRow>) => {
    if (!e.data) return;
    router.push(`/exco/clusters/networks/${e.data.id}`);
  };

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'network',
      pluralItemName: 'networks',
      onArchive: (selected) => setConfirm({ kind: 'archive', targets: selected }),
      onDelete: (selected) => setConfirm({ kind: 'delete', targets: selected }),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'network' : 'networks'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        onCreate={openCreate}
        createLabel="Create New Network"
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={handleRowClicked}
        showColumnPicker={false}
        massActions={massActions}
      />

      {dialogState && (
        <NetworkFormDialog
          open
          onOpenChange={(o) => {
            if (!o) setDialogState(null);
          }}
          mode={dialogState.mode}
          initial={dialogState.mode === 'edit' ? dialogState.initial : undefined}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={buildConfirmTitle(confirm)}
        description={
          confirm?.kind === 'delete'
            ? 'Deleted networks disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them.'
            : 'Archived networks disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them.'
        }
        confirmLabel={confirm?.kind === 'delete' ? 'Delete' : 'Archive'}
        onConfirm={() => {
          if (!confirm) return;
          const targets = confirm.targets;
          const kind = confirm.kind;
          setConfirm(null);
          runArchive(targets, kind);
        }}
        onCancel={() => setConfirm(null)}
      />

      {pending && <span className="sr-only">Working…</span>}
    </div>
  );
}

function buildConfirmTitle(confirm: ConfirmState): string {
  if (!confirm) return '';
  const verb = confirm.kind === 'delete' ? 'Delete' : 'Archive';
  const n = confirm.targets.length;
  if (n === 1) {
    const name = confirm.targets[0]?.name ?? 'this network';
    return `${verb} ${name}?`;
  }
  return `${verb} ${n} networks?`;
}

function NetworkChip({
  color,
  icon,
}: {
  readonly color: string | null;
  readonly icon: string | null;
}) {
  return (
    <div className="flex h-full items-center">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm"
        style={{
          backgroundImage: buildChipGradient(color ?? '#374151'),
        }}
        aria-hidden
      >
        <NetworkIcon name={icon} className="h-5 w-5" />
      </div>
    </div>
  );
}

/**
 * Signature accent gradient — the same three-stop diagonal the houses
 * header uses. Light lift at top-left, base color mid-way, ~45%-darker
 * bottom-right. `color-mix` is broadly supported now.
 */
export function buildChipGradient(color: string): string {
  return `linear-gradient(135deg, color-mix(in srgb, ${color} 82%, white) 0%, ${color} 45%, color-mix(in srgb, ${color} 55%, black) 100%)`;
}

function NetworkStatusBadge({ status }: { readonly status: ScopeStatus }) {
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

function RowActions({
  row,
  onEdit,
  onArchive,
  onDelete,
}: {
  readonly row: SerialRow;
  readonly onEdit: (row: SerialRow) => void;
  readonly onArchive: (row: SerialRow) => void;
  readonly onDelete: (row: SerialRow) => void;
}) {
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
        <DropdownMenuItem onClick={() => onEdit(row)}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onArchive(row)}>
          <Archive className="h-4 w-4" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(row)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
