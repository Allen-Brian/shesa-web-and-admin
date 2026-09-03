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

import { deleteSiteEvents } from '../actions/site-events';
import { SiteEventCategoryManagerDialog } from './site-event-category-manager-dialog';
import type { CategoryRow, SiteEventRow } from './site-event-widget-types';
import { useEventColumns, type EventSerialRow } from './use-event-columns';

interface Props {
  readonly events: readonly SiteEventRow[];
  readonly categories: readonly CategoryRow[];
}

/**
 * Editor's Site Events list — same shape as News + Projects. Filter
 * by upcoming / past. Featured events show a sparkle marker; ticketed
 * events show a ticket icon.
 */
export function SiteEventsListView({ events, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [gridApi, setGridApi] = useState<GridApi<EventSerialRow> | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmMulti, setConfirmMulti] = useState<readonly EventSerialRow[]>([]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const flat = useMemo<EventSerialRow[]>(() => {
    return events.map((e, i) => ({
      ...e,
      serial: i + 1,
      categoryLabels: e.categoryIds
        .map((id) => categoryById.get(id)?.name)
        .filter(Boolean)
        .join(', '),
    }));
  }, [events, categoryById]);

  const filtered = useMemo<EventSerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return flat.filter((r) => {
      if (statusFilter === 'upcoming' && new Date(r.startsAt).getTime() <= now) return false;
      if (statusFilter === 'past' && new Date(r.startsAt).getTime() > now) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.categoryLabels.toLowerCase().includes(q) ||
        !!r.shortDescription?.toLowerCase().includes(q) ||
        !!r.city?.toLowerCase().includes(q) ||
        !!r.location?.toLowerCase().includes(q)
      );
    });
  }, [flat, search, statusFilter]);

  const runDelete = (rows: readonly { readonly id: string; readonly title: string }[]) => {
    startTransition(async () => {
      const res = await deleteSiteEvents(rows.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        rows.length === 1 ? `"${rows[0]!.title}" removed.` : `Removed ${rows.length} events.`,
      );
      setConfirmMulti([]);
      router.refresh();
    });
  };

  const columnDefs = useEventColumns({
    onOpen: (row) => router.push(`/editor/site-events/${row.id}/edit`),
  });

  const massActions = useMemo<MassActions<EventSerialRow>>(
    () => ({
      itemName: 'event',
      pluralItemName: 'events',
      onDelete: (selected) => setConfirmMulti(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Curate the public Events page. Only one event can be featured at a time — turning the flag
          on for a row automatically clears it off the previously featured one.
        </p>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          <Layers className="h-4 w-4" />
          Manage categories
        </Button>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'event' : 'events'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        onCreate={() => router.push('/editor/site-events/new')}
        createLabel="New event"
        filters={
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'all' | 'upcoming' | 'past')}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<EventSerialRow>
        rowData={filtered}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable
        rowHeight={90}
        massActions={massActions}
        onRowClicked={(e) => e.data && router.push(`/editor/site-events/${e.data.id}/edit`)}
      />

      <SiteEventCategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmMulti.length > 0}
        title={`Remove ${confirmMulti.length} event${confirmMulti.length === 1 ? '' : 's'}?`}
        description="They'll all disappear from the public Events page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove all'}
        onConfirm={() => runDelete(confirmMulti)}
        onCancel={() => setConfirmMulti([])}
      />
    </div>
  );
}
