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

import { archiveEvent, publishEvent } from '../event-actions';
import { CalendarView } from './calendar-view';
import { EventsFilterChips } from './events-filter-chips';
import { EventsFilterDropdown } from './events-filter-dropdown';
import { buildEventsColumnDefs } from './list-columns';
import { buildConfirmTitle } from './list-helpers';
import type { ConfirmState, EventRow, ModeFilter, SerialRow } from './list-types';
import { ViewTabs } from './view-tabs';

export type { EventRow } from './list-types';

interface EventsListViewProps {
  readonly data: readonly EventRow[];
}

/**
 * Events list view. Two-tab shell (List / Calendar); on List, the
 * EntityTablePanel hosts the filter dropdown as its right-slot filter
 * — same pattern as Members.
 */
export function EventsListView({ data }: EventsListViewProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [typeFilter, setTypeFilter] = useState<readonly string[]>([]);

  const clearFilters = () => {
    setModeFilter('all');
    setTypeFilter([]);
  };
  const activeCount = (modeFilter === 'all' ? 0 : 1) + typeFilter.length;

  const numbered = useMemo<readonly SerialRow[]>(
    () => data.map((r, i) => ({ ...r, serial: i + 1 })),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return numbered.filter((r) => {
      if (modeFilter !== 'all' && r.mode !== modeFilter) return false;
      if (typeFilter.length > 0 && !typeFilter.some((t) => r.types.includes(t))) return false;
      if (!q) return true;
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.ownerScopeName.toLowerCase().includes(q)) return true;
      if (r.status.toLowerCase().includes(q)) return true;
      if (r.types.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [numbered, search, modeFilter, typeFilter]);

  const openCreate = () => router.push('/exco/events/new');
  const openDetail = (row: SerialRow) => router.push(`/exco/events/${row.id}`);

  const runPublish = (row: SerialRow) => {
    startTransition(async () => {
      const result = await publishEvent(row.id);
      if (result.ok) toast.success(`"${row.name}" published.`);
      else toast.error(result.message ?? 'Could not publish.');
      router.refresh();
    });
  };

  const runArchive = (targets: readonly SerialRow[], kind: 'archive' | 'delete') => {
    startTransition(async () => {
      const results = await Promise.all(targets.map((t) => archiveEvent(t.id)));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(
          `${kind === 'archive' ? 'Archived' : 'Deleted'} ${targets.length} event${
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

  const columnDefs = useMemo(
    () =>
      buildEventsColumnDefs({
        onPublish: runPublish,
        onEdit: openDetail,
        onArchive: (r) => setConfirm({ kind: 'archive', targets: [r] }),
        onDelete: (r) => setConfirm({ kind: 'delete', targets: [r] }),
      }),
    [],
  );

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'event',
      pluralItemName: 'events',
      onArchive: (selected) => setConfirm({ kind: 'archive', targets: selected }),
      onDelete: (selected) => setConfirm({ kind: 'delete', targets: selected }),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ViewTabs view={view} onChange={setView} />

      {view === 'list' && (
        <>
          <EntityTablePanel
            count={filtered.length}
            countLabel={filtered.length === 1 ? 'event' : 'events'}
            search={search}
            onSearchChange={setSearch}
            gridApi={gridApi}
            canCreate
            onCreate={openCreate}
            createLabel="Create Event"
            filters={
              <EventsFilterDropdown
                modeValue={modeFilter}
                typeValues={typeFilter}
                activeCount={activeCount}
                onApply={(m, t) => {
                  setModeFilter(m);
                  setTypeFilter(t);
                }}
                onClearAll={clearFilters}
              />
            }
          />

          <EventsFilterChips
            modeValue={modeFilter}
            typeValues={typeFilter}
            onClearMode={() => setModeFilter('all')}
            onRemoveType={(v) => setTypeFilter((prev) => prev.filter((x) => x !== v))}
            onClearAll={clearFilters}
          />

          <DataTable<SerialRow>
            rowData={filtered as SerialRow[]}
            columnDefs={columnDefs}
            getRowId={(p) => p.data.id}
            onGridReady={(e) => setGridApi(e.api)}
            showColumnPicker={false}
            massActions={massActions}
            onRowClicked={(e) => {
              if (e.data) openDetail(e.data);
            }}
          />
        </>
      )}

      {view === 'calendar' && <CalendarView data={data} />}

      <ConfirmDialog
        open={!!confirm}
        title={buildConfirmTitle(confirm)}
        description={
          confirm?.kind === 'delete'
            ? 'Deleted events are soft-removed. Delivery + RSVP history is retained for audit.'
            : 'Archived events are soft-removed. Delivery + RSVP history is retained for audit.'
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
