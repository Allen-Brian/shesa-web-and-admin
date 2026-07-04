'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react';

import {
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
} from '@shesa/ui';

import { archiveAnnouncement, publishAnnouncement } from '../actions';

export interface AnnouncementRow {
  readonly id: string;
  readonly title: string;
  readonly ownerScopeId: string;
  readonly ownerScopeName: string;
  readonly status: string;
  readonly channels: ReadonlyArray<'in_app' | 'email' | 'forum'>;
  readonly createdAt: string | null;
  readonly publishedAt: string | null;
  readonly expiresAt: string | null;
  readonly membersReached: number;
  readonly readCount: number;
  readonly [key: string]: unknown;
}

type SerialRow = AnnouncementRow & { readonly serial: number };

type ConfirmState = null | {
  readonly kind: 'archive' | 'delete';
  readonly targets: readonly SerialRow[];
};

interface AnnouncementsListViewProps {
  readonly data: readonly AnnouncementRow[];
}

/**
 * Status renders as icon + text — cleaner than a colored pill for a
 * lifecycle attribute admins scan by shape rather than color.
 * Tailwind color classes carry the semantic tone; each row picks its
 * own icon.
 */
interface StatusDescriptor {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly className: string;
}

const STATUS: Record<string, StatusDescriptor> = {
  draft: { icon: FileText, label: 'Draft', className: 'text-muted-foreground' },
  scheduled: { icon: Clock, label: 'Scheduled', className: 'text-amber-600' },
  published: { icon: CheckCircle2, label: 'Published', className: 'text-emerald-600' },
  unpublished: { icon: Ban, label: 'Unpublished', className: 'text-muted-foreground' },
  archived: { icon: Archive, label: 'Archived', className: 'text-muted-foreground' },
};

const STATUS_FALLBACK: StatusDescriptor = STATUS.draft as StatusDescriptor;

function StatusCell({ status }: { readonly status: string }) {
  const desc = STATUS[status] ?? STATUS_FALLBACK;
  const Icon = desc.icon;
  return (
    <span className={`inline-flex h-full items-center gap-1.5 text-sm ${desc.className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{desc.label}</span>
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
        headerName: 'Title',
        field: 'title',
        flex: 1,
        minWidth: 240,
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 150,
        cellRenderer: (params: ICellRendererParams<SerialRow, string>) => (
          <StatusCell status={params.value ?? 'draft'} />
        ),
      },
      {
        headerName: 'Created',
        field: 'createdAt',
        width: 200,
        valueFormatter: (p) => formatDate(p.value as string | null),
      },
      {
        headerName: 'Members reached',
        field: 'membersReached',
        width: 150,
        cellClass: 'text-center',
      },
      {
        headerName: 'Read count',
        field: 'readCount',
        width: 150,
        cellClass: 'text-center',
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 150,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<SerialRow>) =>
          params.data ? (
            <RowActions
              row={params.data}
              onPublish={runPublish}
              onArchive={(r) => setConfirm({ kind: 'archive', targets: [r] })}
              onDelete={(r) => setConfirm({ kind: 'delete', targets: [r] })}
            />
          ) : null,
      },
    ],
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
        getRowId={(params) => params.data.id}
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

function buildConfirmTitle(confirm: ConfirmState): string {
  if (!confirm) return '';
  const verb = confirm.kind === 'delete' ? 'Delete' : 'Archive';
  const n = confirm.targets.length;
  if (n === 1) {
    const name = confirm.targets[0]?.title ?? 'this announcement';
    return `${verb} "${name}"?`;
  }
  return `${verb} ${n} announcements?`;
}

interface RowActionsProps {
  readonly row: SerialRow;
  readonly onPublish: (r: SerialRow) => void;
  readonly onArchive: (r: SerialRow) => void;
  readonly onDelete: (r: SerialRow) => void;
}

function RowActions({ row, onPublish, onArchive, onDelete }: RowActionsProps) {
  const isDraftOrScheduled = row.status === 'draft' || row.status === 'scheduled';
  const canArchive = row.status !== 'archived';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {isDraftOrScheduled && (
          <>
            <DropdownMenuItem onSelect={() => onPublish(row)}>
              <Send className="mr-2 h-4 w-4" />
              Publish
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem disabled>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {canArchive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onArchive(row)}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(row)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
