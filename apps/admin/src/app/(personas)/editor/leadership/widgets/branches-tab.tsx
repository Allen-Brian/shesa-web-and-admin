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

import {
  createBranchLeader,
  deleteBranchLeaders,
  updateBranchLeader,
} from '../actions/regional-leaders';
import { RegionalLeaderDialog, type OrganOption } from './regional-leader-dialog';
import type { RegionalLeaderRow } from './leadership-widget-types';
import { useRegionalColumns, type RegionalSerialRow } from './use-regional-columns';

/** Branches tab — DataTable of every branch/chapter president. */
export function BranchesTab({
  leaders,
  organs,
}: {
  readonly leaders: readonly RegionalLeaderRow[];
  readonly organs: readonly OrganOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<RegionalSerialRow> | null>(null);
  const [dialog, setDialog] = useState<{ editing: RegionalLeaderRow | null } | null>(null);
  const [confirmSingle, setConfirmSingle] = useState<RegionalLeaderRow | null>(null);
  const [confirmMulti, setConfirmMulti] = useState<readonly RegionalSerialRow[]>([]);

  const nextSort = leaders.length ? Math.max(...leaders.map((l) => l.sortOrder)) + 10 : 10;

  const filtered = useMemo<RegionalSerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return leaders
      .filter(
        (r) =>
          !q ||
          r.branchName.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          !!r.region?.toLowerCase().includes(q),
      )
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [leaders, search]);

  const runDelete = (rows: readonly { readonly id: string; readonly branchName: string }[]) => {
    startTransition(async () => {
      const res = await deleteBranchLeaders(rows.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        rows.length === 1
          ? `${rows[0]!.branchName} removed.`
          : `Removed ${rows.length} branch presidents.`,
      );
      setConfirmSingle(null);
      setConfirmMulti([]);
      router.refresh();
    });
  };

  const columnDefs = useRegionalColumns({
    branchColumnLabel: 'Branch / Chapter',
    onEdit: (row) => setDialog({ editing: row }),
    onDelete: (row) => setConfirmSingle(row),
  });

  const massActions = useMemo<MassActions<RegionalSerialRow>>(
    () => ({
      itemName: 'branch president',
      pluralItemName: 'branch presidents',
      onDelete: (selected) => setConfirmMulti(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Branch and chapter presidents shown on the public Leadership page. One row per branch.
      </p>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'branch president' : 'branch presidents'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        onCreate={() => setDialog({ editing: null })}
        createLabel="New branch president"
      />

      <DataTable<RegionalSerialRow>
        rowData={filtered}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable
        massActions={massActions}
      />

      {dialog && (
        <RegionalLeaderDialog
          organs={organs}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          kind="branch"
          editing={dialog.editing}
          nextSortOrder={nextSort}
          onCreate={createBranchLeader}
          onUpdate={updateBranchLeader}
        />
      )}

      <ConfirmDialog
        open={!!confirmSingle}
        title={confirmSingle ? `Remove ${confirmSingle.branchName}?` : ''}
        description="The entry will disappear from the public Leadership page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove'}
        onConfirm={() => confirmSingle && runDelete([confirmSingle])}
        onCancel={() => setConfirmSingle(null)}
      />
      <ConfirmDialog
        open={confirmMulti.length > 0}
        title={`Remove ${confirmMulti.length} branch president${confirmMulti.length === 1 ? '' : 's'}?`}
        description="They'll all disappear from the public Leadership page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove all'}
        onConfirm={() => runDelete(confirmMulti)}
        onCancel={() => setConfirmMulti([])}
      />
    </div>
  );
}
