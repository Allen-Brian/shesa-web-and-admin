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

import type { ScopeStatus } from '@/components/clusters/cluster-list';
import { formatOrdinal } from '@/lib/batches/ordinal';

import { archiveBatch } from '../batch-actions';
import { BatchFormDialog } from './form-dialog';
import type { BatchInitialValues } from './batch-form';

export interface BatchRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly entry_year: number;
  readonly ordinal: number | null;
  readonly nickname: string | null;
  readonly description: string | null;
  readonly contact_email: string | null;
  readonly contact_phone: string | null;
  readonly member_count: number;
  readonly [key: string]: unknown;
}

type SerialRow = BatchRow & { readonly serial: number };

type ConfirmState = null | {
  readonly kind: 'archive' | 'delete';
  readonly targets: readonly SerialRow[];
};

interface BatchesListViewProps {
  readonly data: readonly BatchRow[];
  readonly canCreate: boolean;
}

export function BatchesListView({ data, canCreate }: BatchesListViewProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [dialogState, setDialogState] = useState<
    | { readonly mode: 'create' }
    | { readonly mode: 'edit'; readonly initial: BatchInitialValues }
    | null
  >(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  const numbered = useMemo<readonly SerialRow[]>(
    () => data.map((r, i) => ({ ...r, serial: i + 1 })),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      if (String(r.entry_year).includes(q)) return true;
      if (r.ordinal != null && String(r.ordinal).includes(q)) return true;
      if (r.nickname?.toLowerCase().includes(q)) return true;
      if (r.description?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [numbered, search]);

  const openCreate = () => setDialogState({ mode: 'create' });
  const openEdit = (row: BatchRow) =>
    setDialogState({
      mode: 'edit',
      initial: {
        scopeId: row.id,
        name: row.name,
        slug: row.slug,
        entryYear: row.entry_year,
        ordinal: row.ordinal,
        nickname: row.nickname,
        description: row.description,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
      },
    });

  const runArchive = (targets: readonly SerialRow[], kind: 'archive' | 'delete') => {
    startTransition(async () => {
      const results = await Promise.all(targets.map((t) => archiveBatch(t.id)));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(
          `${kind === 'archive' ? 'Archived' : 'Deleted'} ${targets.length} batch${
            targets.length === 1 ? '' : 'es'
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
        headerName: 'Batch',
        field: 'name',
        flex: 1,
        minWidth: 160,
      },
      {
        headerName: 'Ordinal',
        field: 'ordinal',
        flex: 1,
        width: 120,
        valueFormatter: (p) => formatOrdinal(p.value ?? null) ?? '—',
      },
      {
        headerName: 'Nickname',
        field: 'nickname',
        flex: 1,
        minWidth: 140,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Members',
        field: 'member_count',
        flex: 1,
        width: 120,
        cellClass: 'text-center',
      },
      {
        headerName: 'Status',
        field: 'status',
        flex: 1,
        width: 130,
        cellRenderer: (params: ICellRendererParams<SerialRow, ScopeStatus>) => (
          <BatchStatusBadge status={params.value ?? 'active'} />
        ),
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 120,
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
    router.push(`/exco/clusters/batches/${e.data.slug}`);
  };

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'batch',
      pluralItemName: 'batches',
      onArchive: (selected) => setConfirm({ kind: 'archive', targets: selected }),
      onDelete: (selected) => setConfirm({ kind: 'delete', targets: selected }),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'batch' : 'batches'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        onCreate={openCreate}
        createLabel="Create New Batch"
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
        <BatchFormDialog
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
        description="Archived batches disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them."
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
    const name = confirm.targets[0]?.name ?? 'this batch';
    return `${verb} ${name}?`;
  }
  return `${verb} ${n} batches?`;
}

function BatchStatusBadge({ status }: { readonly status: ScopeStatus }) {
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
