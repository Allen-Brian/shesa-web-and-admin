'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  toast,
  type GridApi,
  type MassActions,
} from '@shesa/ui';

import { deleteBatchLeaders } from '../actions/batch-leaders';
import { BatchLeaderDialog } from './batch-leader-dialog';
import type { BatchLeaderRow } from './leadership-widget-types';
import { useBatchColumns, type BatchSerialRow } from './use-batch-columns';

/** Batches tab — DataTable of every batch chair. Batch label is unique. */
export function BatchesTab({ leaders }: { readonly leaders: readonly BatchLeaderRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<BatchSerialRow> | null>(null);
  const [dialog, setDialog] = useState<{ editing: BatchLeaderRow | null } | null>(null);
  const [confirmSingle, setConfirmSingle] = useState<BatchLeaderRow | null>(null);
  const [confirmMulti, setConfirmMulti] = useState<readonly BatchSerialRow[]>([]);

  const nextSort = leaders.length ? Math.max(...leaders.map((l) => l.sortOrder)) + 10 : 10;

  const filtered = useMemo<BatchSerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return leaders
      .filter((r) => !q || r.batch.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [leaders, search]);

  const runDelete = (
    rows: readonly { readonly id: string; readonly batch: string; readonly name: string }[],
  ) => {
    startTransition(async () => {
      const res = await deleteBatchLeaders(rows.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        rows.length === 1
          ? `Batch ${rows[0]!.batch} chair (${rows[0]!.name}) removed.`
          : `Removed ${rows.length} batch chairs.`,
      );
      setConfirmSingle(null);
      setConfirmMulti([]);
      router.refresh();
    });
  };

  const columnDefs = useBatchColumns({
    onEdit: (row) => setDialog({ editing: row }),
    onDelete: (row) => setConfirmSingle(row),
  });

  const massActions = useMemo<MassActions<BatchSerialRow>>(
    () => ({
      itemName: 'batch chair',
      pluralItemName: 'batch chairs',
      onDelete: (selected) => setConfirmMulti(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        The batch chair (class rep) for each graduating year. Batch labels are unique — one chair
        per batch on the public page.
      </p>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'batch chair' : 'batch chairs'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        onCreate={() => setDialog({ editing: null })}
        createLabel="New batch chair"
      />

      <DataTable<BatchSerialRow>
        rowData={filtered}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable
        massActions={massActions}
      />

      {dialog && (
        <BatchLeaderDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          editing={dialog.editing}
          nextSortOrder={nextSort}
        />
      )}

      <ConfirmDialog
        open={!!confirmSingle}
        title={confirmSingle ? `Remove Batch ${confirmSingle.batch} chair?` : ''}
        description={
          confirmSingle
            ? `${confirmSingle.name} will disappear from the public Leadership page immediately.`
            : ''
        }
        confirmLabel={pending ? 'Removing…' : 'Remove'}
        onConfirm={() => confirmSingle && runDelete([confirmSingle])}
        onCancel={() => setConfirmSingle(null)}
      />
      <ConfirmDialog
        open={confirmMulti.length > 0}
        title={`Remove ${confirmMulti.length} batch chair${confirmMulti.length === 1 ? '' : 's'}?`}
        description="They'll all disappear from the public Leadership page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove all'}
        onConfirm={() => runDelete(confirmMulti)}
        onCancel={() => setConfirmMulti([])}
      />
    </div>
  );
}
