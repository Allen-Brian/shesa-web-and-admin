'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  toast,
  type GridApi,
  type MassActions,
} from '@shesa/ui';

import { deleteMainstreamLeaders } from '../actions/mainstream-leaders';
import { MainstreamLeaderDialog } from './mainstream-leader-dialog';
import { LeadershipSectorManagerDialog } from './leadership-sector-manager-dialog';
import type { MainstreamLeaderRow, SectorRow } from './leadership-widget-types';
import { useMainstreamColumns, type MainstreamSerialRow } from './use-mainstream-columns';

interface Props {
  readonly sectors: readonly SectorRow[];
}

/**
 * Global (Mainstream) tab. Every leader across every sector shows up
 * as a row; the Sector column keeps the grouping visible. Sector CRUD
 * is one click away in a manager dialog — the sector set is small, so
 * a full table for it would be overkill.
 */
export function MainstreamTab({ sectors }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<MainstreamSerialRow> | null>(null);
  const [sectorsOpen, setSectorsOpen] = useState(false);
  const [leaderDialog, setLeaderDialog] = useState<{
    defaultSectorId: string | null;
    editing: MainstreamLeaderRow | null;
  } | null>(null);
  const [confirmSingle, setConfirmSingle] = useState<MainstreamLeaderRow | null>(null);
  const [confirmMulti, setConfirmMulti] = useState<readonly MainstreamSerialRow[]>([]);

  const flat = useMemo<MainstreamSerialRow[]>(() => {
    const rows: MainstreamSerialRow[] = [];
    let serial = 0;
    for (const sector of sectors) {
      for (const leader of sector.leaders) {
        rows.push({ ...leader, sectorName: sector.name, serial: ++serial });
      }
    }
    return rows;
  }, [sectors]);

  const filtered = useMemo<MainstreamSerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flat;
    return flat.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.position.toLowerCase().includes(q) ||
        r.sectorName.toLowerCase().includes(q) ||
        !!r.location?.toLowerCase().includes(q),
    );
  }, [flat, search]);

  const runDelete = (rows: readonly { readonly id: string; readonly name: string }[]) => {
    startTransition(async () => {
      const res = await deleteMainstreamLeaders(rows.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        rows.length === 1 ? `${rows[0]!.name} removed.` : `Removed ${rows.length} leaders.`,
      );
      setConfirmSingle(null);
      setConfirmMulti([]);
      router.refresh();
    });
  };

  const columnDefs = useMainstreamColumns({
    onEdit: (row) => setLeaderDialog({ defaultSectorId: row.sectorId, editing: row }),
    onDelete: (row) => setConfirmSingle(row),
  });

  const massActions = useMemo<MassActions<MainstreamSerialRow>>(
    () => ({
      itemName: 'leader',
      pluralItemName: 'leaders',
      onDelete: (selected) => setConfirmMulti(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Group the mainstream slate into sectors, then add each leader with their photo, position,
          name, and location.
        </p>
        <Button variant="outline" size="sm" onClick={() => setSectorsOpen(true)}>
          <Layers className="h-4 w-4" />
          Manage sectors
        </Button>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'leader' : 'leaders'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={sectors.length > 0}
        onCreate={() => setLeaderDialog({ defaultSectorId: sectors[0]?.id ?? null, editing: null })}
        createLabel="New leader"
      />

      {sectors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Create at least one sector first, then add leaders under it.
        </div>
      ) : (
        <DataTable<MainstreamSerialRow>
          rowData={filtered}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onGridReady={(e) => setGridApi(e.api)}
          showColumnPicker={false}
          selectable
          massActions={massActions}
        />
      )}

      <LeadershipSectorManagerDialog
        open={sectorsOpen}
        onOpenChange={setSectorsOpen}
        sectors={sectors}
      />

      {leaderDialog && sectors.length > 0 && (
        <MainstreamLeaderDialog
          open
          onOpenChange={(o) => !o && setLeaderDialog(null)}
          sectors={sectors}
          defaultSectorId={leaderDialog.defaultSectorId}
          editing={leaderDialog.editing}
        />
      )}

      <ConfirmDialog
        open={!!confirmSingle}
        title={confirmSingle ? `Remove ${confirmSingle.name}?` : ''}
        description="They'll disappear from the public Leadership page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove'}
        onConfirm={() => confirmSingle && runDelete([confirmSingle])}
        onCancel={() => setConfirmSingle(null)}
      />

      <ConfirmDialog
        open={confirmMulti.length > 0}
        title={`Remove ${confirmMulti.length} leader${confirmMulti.length === 1 ? '' : 's'}?`}
        description="They'll all disappear from the public Leadership page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove all'}
        onConfirm={() => runDelete(confirmMulti)}
        onCancel={() => setConfirmMulti([])}
      />
    </div>
  );
}
