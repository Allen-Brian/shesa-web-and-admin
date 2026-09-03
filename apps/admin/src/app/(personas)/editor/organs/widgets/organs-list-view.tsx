'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  type GridApi,
  type MassActions,
} from '@shesa/ui';

import { deleteOrgans } from '../actions/organs';
import { OrganSectorManagerDialog } from './organ-sector-manager-dialog';
import type { OrganRow, SectorRow } from './organ-widget-types';
import { useOrganColumns, type OrganSerialRow } from './use-organ-columns';

interface Props {
  readonly organs: readonly OrganRow[];
  readonly sectors: readonly SectorRow[];
}

/** Editor's Organs list. */
export function OrgansListView({ organs, sectors }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [gridApi, setGridApi] = useState<GridApi<OrganSerialRow> | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmMulti, setConfirmMulti] = useState<readonly OrganSerialRow[]>([]);

  const sectorById = useMemo(() => new Map(sectors.map((s) => [s.id, s])), [sectors]);

  const flat = useMemo<OrganSerialRow[]>(() => {
    return organs.map((o, i) => ({
      ...o,
      serial: i + 1,
      sectorName: sectorById.get(o.sectorId)?.name ?? '—',
    }));
  }, [organs, sectorById]);

  const filtered = useMemo<OrganSerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return flat.filter((r) => {
      if (sectorFilter !== 'all' && r.sectorId !== sectorFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.sectorName.toLowerCase().includes(q) ||
        !!r.location?.toLowerCase().includes(q) ||
        !!r.country?.toLowerCase().includes(q)
      );
    });
  }, [flat, search, sectorFilter]);

  const runDelete = (rows: readonly { readonly id: string; readonly name: string }[]) => {
    startTransition(async () => {
      const res = await deleteOrgans(rows.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        rows.length === 1 ? `"${rows[0]!.name}" removed.` : `Removed ${rows.length} organs.`,
      );
      setConfirmMulti([]);
      router.refresh();
    });
  };

  const columnDefs = useOrganColumns({
    onOpen: (row) => router.push(`/editor/organs/${row.id}/edit`),
  });

  const massActions = useMemo<MassActions<OrganSerialRow>>(
    () => ({
      itemName: 'organ',
      pluralItemName: 'organs',
      onDelete: (selected) => setConfirmMulti(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Every SHESA organ — the National body, the sectors, and the branches. Filter by sector to
          focus on one grouping at a time.
        </p>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          <Layers className="h-4 w-4" />
          Manage sectors
        </Button>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'organ' : 'organs'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        onCreate={() => router.push('/editor/organs/new')}
        createLabel="New organ"
        filters={
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <DataTable<OrganSerialRow>
        rowData={filtered}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable
        rowHeight={80}
        massActions={massActions}
        onRowClicked={(e) => e.data && router.push(`/editor/organs/${e.data.id}/edit`)}
      />

      <OrganSectorManagerDialog open={manageOpen} onOpenChange={setManageOpen} sectors={sectors} />

      <ConfirmDialog
        open={confirmMulti.length > 0}
        title={`Remove ${confirmMulti.length} organ${confirmMulti.length === 1 ? '' : 's'}?`}
        description="They'll all disappear from the public Organs page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove all'}
        onConfirm={() => runDelete(confirmMulti)}
        onCancel={() => setConfirmMulti([])}
      />
    </div>
  );
}
