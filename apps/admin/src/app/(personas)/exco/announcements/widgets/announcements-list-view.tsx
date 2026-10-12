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

import { archiveAnnouncement, publishAnnouncement } from '../announcement-actions';
import { buildConfirmTitle } from './list-helpers';
import { buildAnnouncementsColumnDefs } from './list-columns';
import type { AnnouncementRow, ConfirmState, SerialRow } from './list-types';

export type { AnnouncementRow } from './list-types';

interface AnnouncementsListViewProps {
  readonly data: readonly AnnouncementRow[];
}

export function AnnouncementsListView({ data }: AnnouncementsListViewProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  // Stable S/N — assigned before the search filter so a row keeps its
  // number when it drops out of the current search result.
  const numbered = useMemo<readonly SerialRow[]>(
    () => data.map((r, i) => ({ ...r, serial: i + 1 })),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter((r) => {
      if (r.title.toLowerCase().includes(q)) return true;
      if (r.ownerScopeName.toLowerCase().includes(q)) return true;
      if (r.status.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [numbered, search]);

  const openCreate = () => router.push('/exco/announcements/new');

  const runPublish = (row: SerialRow) => {
    startTransition(async () => {
      const result = await publishAnnouncement(row.id);
      if (result.ok) toast.success(`"${row.title}" published.`);
      else toast.error(result.message ?? 'Could not publish.');
      router.refresh();
    });
  };

  const runArchive = (targets: readonly SerialRow[], kind: 'archive' | 'delete') => {
    startTransition(async () => {
      const results = await Promise.all(targets.map((t) => archiveAnnouncement(t.id)));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success(
          `${kind === 'archive' ? 'Archived' : 'Deleted'} ${targets.length} announcement${
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
      buildAnnouncementsColumnDefs({
        onPublish: runPublish,
        onArchive: (r) => setConfirm({ kind: 'archive', targets: [r] }),
        onDelete: (r) => setConfirm({ kind: 'delete', targets: [r] }),
      }),
    [],
  );

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'announcement',
      pluralItemName: 'announcements',
      onArchive: (selected) => setConfirm({ kind: 'archive', targets: selected }),
      onDelete: (selected) => setConfirm({ kind: 'delete', targets: selected }),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'announcement' : 'announcements'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        onCreate={openCreate}
        createLabel="Create Announcement"
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        massActions={massActions}
      />

      <ConfirmDialog
        open={!!confirm}
        title={buildConfirmTitle(confirm)}
        description={
          confirm?.kind === 'delete'
            ? "Deleted announcements are soft-removed — their delivery history is retained for audit but they disappear from members' inboxes."
            : "Archived announcements are soft-removed — their delivery history is retained for audit but they disappear from members' inboxes."
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
