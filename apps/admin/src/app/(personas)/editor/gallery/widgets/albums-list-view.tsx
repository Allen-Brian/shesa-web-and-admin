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

import { deleteAlbums } from '../actions/albums';
import { AlbumCategoryManagerDialog } from './album-category-manager-dialog';
import type { AlbumRow, CategoryRow, LinkableEvent } from './gallery-widget-types';
import { useAlbumColumns, type AlbumSerialRow } from './use-album-columns';

interface Props {
  readonly albums: readonly AlbumRow[];
  readonly categories: readonly CategoryRow[];
  readonly events: readonly LinkableEvent[];
}

/** Editor's Gallery Albums list — same shape as News + Projects + Site Events. */
export function AlbumsListView({ albums, categories, events }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [gridApi, setGridApi] = useState<GridApi<AlbumSerialRow> | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmMulti, setConfirmMulti] = useState<readonly AlbumSerialRow[]>([]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const flat = useMemo<AlbumSerialRow[]>(() => {
    return albums.map((a, i) => ({
      ...a,
      serial: i + 1,
      categoryLabels: a.categoryIds
        .map((id) => categoryById.get(id)?.name)
        .filter(Boolean)
        .join(', '),
      eventTitle: a.linkedEventId ? (eventById.get(a.linkedEventId)?.title ?? null) : null,
    }));
  }, [albums, categoryById, eventById]);

  const filtered = useMemo<AlbumSerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return flat.filter((r) => {
      if (linkFilter === 'linked' && !r.linkedEventId) return false;
      if (linkFilter === 'unlinked' && r.linkedEventId) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.categoryLabels.toLowerCase().includes(q) ||
        !!r.dateLabel?.toLowerCase().includes(q) ||
        !!r.location?.toLowerCase().includes(q) ||
        !!r.eventTitle?.toLowerCase().includes(q)
      );
    });
  }, [flat, search, linkFilter]);

  const runDelete = (rows: readonly { readonly id: string; readonly title: string }[]) => {
    startTransition(async () => {
      const res = await deleteAlbums(rows.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        rows.length === 1 ? `"${rows[0]!.title}" removed.` : `Removed ${rows.length} albums.`,
      );
      setConfirmMulti([]);
      router.refresh();
    });
  };

  const columnDefs = useAlbumColumns({
    onOpen: (row) => router.push(`/editor/gallery/${row.id}/edit`),
  });

  const massActions = useMemo<MassActions<AlbumSerialRow>>(
    () => ({
      itemName: 'album',
      pluralItemName: 'albums',
      onDelete: (selected) => setConfirmMulti(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Curate the public Gallery. Albums can be linked to Site Events — the linked event page
          gets a “View album” button that jumps to the album.
        </p>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          <Layers className="h-4 w-4" />
          Manage categories
        </Button>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'album' : 'albums'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        onCreate={() => router.push('/editor/gallery/new')}
        createLabel="New album"
        filters={
          <Select
            value={linkFilter}
            onValueChange={(v) => setLinkFilter(v as 'all' | 'linked' | 'unlinked')}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All albums</SelectItem>
              <SelectItem value="linked">Linked to event</SelectItem>
              <SelectItem value="unlinked">Not linked</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<AlbumSerialRow>
        rowData={filtered}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable
        massActions={massActions}
        onRowClicked={(e) => e.data && router.push(`/editor/gallery/${e.data.id}/edit`)}
      />

      <AlbumCategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmMulti.length > 0}
        title={`Remove ${confirmMulti.length} album${confirmMulti.length === 1 ? '' : 's'}?`}
        description="Every album and all of its media items will be removed from the public gallery."
        confirmLabel={pending ? 'Removing…' : 'Remove all'}
        onConfirm={() => runDelete(confirmMulti)}
        onCancel={() => setConfirmMulti([])}
      />
    </div>
  );
}
