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

import { deleteSongs } from '../actions/songs';
import { GroupManagerDialog } from './group-manager-dialog';
import type { GroupRow, SongRow } from './song-widget-types';
import { useSongColumns, type SongSerialRow } from './use-song-columns';

interface Props {
  readonly songs: readonly SongRow[];
  readonly groups: readonly GroupRow[];
}

export function SongsListView({ songs, groups }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [gridApi, setGridApi] = useState<GridApi<SongSerialRow> | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmMulti, setConfirmMulti] = useState<readonly SongSerialRow[]>([]);

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const flat = useMemo<SongSerialRow[]>(() => {
    return songs.map((s, i) => ({
      ...s,
      serial: i + 1,
      groupName: groupById.get(s.groupId)?.name ?? '—',
    }));
  }, [songs, groupById]);

  const filtered = useMemo<SongSerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return flat.filter((r) => {
      if (groupFilter !== 'all' && r.groupId !== groupFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.groupName.toLowerCase().includes(q) ||
        !!r.performer?.toLowerCase().includes(q)
      );
    });
  }, [flat, search, groupFilter]);

  const runDelete = (rows: readonly { readonly id: string; readonly title: string }[]) => {
    startTransition(async () => {
      const res = await deleteSongs(rows.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        rows.length === 1 ? `"${rows[0]!.title}" removed.` : `Removed ${rows.length} songs.`,
      );
      setConfirmMulti([]);
      router.refresh();
    });
  };

  const columnDefs = useSongColumns({
    onOpen: (row) => router.push(`/editor/songs/${row.id}/edit`),
  });

  const massActions = useMemo<MassActions<SongSerialRow>>(
    () => ({
      itemName: 'song',
      pluralItemName: 'songs',
      onDelete: (selected) => setConfirmMulti(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          The SHESA songbook — anthems, chapter songs, and cultural pieces. Filter by group, upload
          audio, and the public player renders it with a waveform.
        </p>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          <Layers className="h-4 w-4" />
          Manage groups
        </Button>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'song' : 'songs'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        onCreate={() => router.push('/editor/songs/new')}
        createLabel="New song"
        filters={
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <DataTable<SongSerialRow>
        rowData={filtered}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable
        rowHeight={80}
        massActions={massActions}
        onRowClicked={(e) => e.data && router.push(`/editor/songs/${e.data.id}/edit`)}
      />

      <GroupManagerDialog open={manageOpen} onOpenChange={setManageOpen} groups={groups} />

      <ConfirmDialog
        open={confirmMulti.length > 0}
        title={`Remove ${confirmMulti.length} song${confirmMulti.length === 1 ? '' : 's'}?`}
        description="They'll all disappear from the public Songs page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove all'}
        onConfirm={() => runDelete(confirmMulti)}
        onCancel={() => setConfirmMulti([])}
      />
    </div>
  );
}
