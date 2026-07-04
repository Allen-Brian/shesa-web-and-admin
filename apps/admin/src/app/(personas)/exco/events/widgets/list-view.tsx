'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Ban,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  Layers,
  LayoutList,
  type LucideIcon,
  MapPin,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react';

import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EntityTablePanel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
} from '@shesa/ui';

import { archiveEvent, publishEvent } from '../actions';
import { CalendarView } from './calendar-view';

export interface EventRow {
  readonly id: string;
  readonly name: string;
  readonly ownerScopeId: string;
  readonly ownerScopeName: string;
  readonly types: readonly string[];
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone: string;
  readonly mode: 'physical' | 'online' | 'hybrid';
  readonly status: string;
  readonly venueName: string | null;
  readonly onlineUrl: string | null;
  readonly createdAt: string | null;
  readonly publishedAt: string | null;
  readonly membersReached: number;
  readonly [key: string]: unknown;
}

type SerialRow = EventRow & { readonly serial: number };

type ConfirmState = null | {
  readonly kind: 'archive' | 'delete';
  readonly targets: readonly SerialRow[];
};

interface EventsListViewProps {
  readonly data: readonly EventRow[];
}

// ─── Status icon + text (mirrors announcements list) ─────────────────

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

// ─── Mode icon + text ────────────────────────────────────────────────

const MODE: Record<'physical' | 'online' | 'hybrid', { icon: LucideIcon; label: string }> = {
  physical: { icon: MapPin, label: 'Physical' },
  online: { icon: Globe, label: 'Online' },
  hybrid: { icon: Layers, label: 'Hybrid' },
};

function ModeCell({ mode }: { readonly mode: EventRow['mode'] }) {
  const desc = MODE[mode];
  const Icon = desc.icon;
  return (
    <span className="inline-flex h-full items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{desc.label}</span>
    </span>
  );
}

// ─── Timeline (relative time to now) ─────────────────────────────────
//
// Empty ring — upcoming ("in Nd"), partial — live ("day X/Y"),
// full — past ("ended Nd ago"). For MVP we render a compact text
// label; the progress-ring visual lands as a follow-up.

function timelineLabel(startIso: string, endIso: string, now: number = Date.now()): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return '—';

  const day = 24 * 60 * 60 * 1000;
  if (now < start) {
    const days = Math.ceil((start - now) / day);
    if (days === 0) return 'starts today';
    if (days === 1) return 'in 1 day';
    return `in ${days} days`;
  }
  if (now > end) {
    const days = Math.ceil((now - end) / day);
    if (days === 0) return 'just ended';
    if (days === 1) return 'ended 1 day ago';
    return `ended ${days} days ago`;
  }
  // Live: within the run window
  const totalDays = Math.max(1, Math.ceil((end - start) / day));
  const currentDay = Math.max(1, Math.ceil((now - start) / day));
  if (totalDays === 1) return 'live now';
  return `day ${currentDay}/${totalDays}`;
}

// ─── Date/time formatting ────────────────────────────────────────────

function formatStart(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Type chips ──────────────────────────────────────────────────────
//
// event_type is snake_case in the DB; render as Title Case for humans.

function humanizeType(t: string): string {
  return t
    .split('_')
    .map((p) => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
}

function TypeCell({ types }: { readonly types: readonly string[] }) {
  if (types.length === 0) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  const first = types[0]!;
  const rest = types.length - 1;
  return (
    <span className="inline-flex h-full items-center gap-1">
      <Badge variant="outline" className="text-xs font-normal">
        {humanizeType(first)}
      </Badge>
      {rest > 0 && (
        <Badge variant="secondary" className="text-xs font-normal">
          +{rest}
        </Badge>
      )}
    </span>
  );
}

// ─── Main list view ──────────────────────────────────────────────────

// ─── Event types catalog (mirrors the create form) ───────────────────

const EVENT_TYPE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'networking', label: 'Networking' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'community_service', label: 'Community Service' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'training', label: 'Training' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' },
];

type ModeFilter = 'all' | 'physical' | 'online' | 'hybrid';

export function EventsListView({ data }: EventsListViewProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [typeFilter, setTypeFilter] = useState<readonly string[]>([]);

  const toggleTypeFilter = (v: string) =>
    setTypeFilter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const clearFilters = () => {
    setModeFilter('all');
    setTypeFilter([]);
  };
  const hasFilters = modeFilter !== 'all' || typeFilter.length > 0;

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
      { headerName: 'Name', field: 'name', flex: 1, minWidth: 220 },
      {
        headerName: 'Type',
        field: 'types',
        flex: 1,
        minWidth: 220,
        cellRenderer: (params: ICellRendererParams<SerialRow>) =>
          params.data ? <TypeCell types={params.data.types} /> : null,
      },
      {
        headerName: 'Date & time',
        field: 'startAt',
        flex: 1,
        minWidth: 220,
        valueFormatter: (p) => formatStart(p.value as string),
      },
      {
        headerName: 'Timeline',
        colId: 'timeline',
        width: 120,
        sortable: false,
        cellRenderer: (params: ICellRendererParams<SerialRow>) =>
          params.data ? (
            <span className="text-sm text-muted-foreground">
              {timelineLabel(params.data.startAt, params.data.endAt)}
            </span>
          ) : null,
      },
      {
        headerName: 'Mode',
        field: 'mode',
        width: 120,
        cellRenderer: (params: ICellRendererParams<SerialRow, EventRow['mode']>) => (
          <ModeCell mode={params.value ?? 'physical'} />
        ),
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: (params: ICellRendererParams<SerialRow, string>) => (
          <StatusCell status={params.value ?? 'draft'} />
        ),
      },
      {
        headerName: 'Reach Count',
        field: 'membersReached',
        width: 150,
        cellClass: 'text-center',
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 120,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<SerialRow>) =>
          params.data ? (
            <RowActions
              row={params.data}
              onPublish={runPublish}
              onEdit={openDetail}
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
      itemName: 'event',
      pluralItemName: 'events',
      onArchive: (selected) => setConfirm({ kind: 'archive', targets: selected }),
      onDelete: (selected) => setConfirm({ kind: 'delete', targets: selected }),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* View tabs — List today; Calendar lands with Slice E5. */}
      <div className="flex items-center gap-1 border-b border-border">
        <ViewTab active={view === 'list'} onClick={() => setView('list')} icon={LayoutList}>
          List
        </ViewTab>
        <ViewTab
          active={view === 'calendar'}
          onClick={() => setView('calendar')}
          icon={CalendarIcon}
        >
          Calendar
        </ViewTab>
      </div>

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
          />

          <div className="flex flex-wrap items-center gap-2">
            <Select value={modeFilter} onValueChange={(v) => setModeFilter(v as ModeFilter)}>
              <SelectTrigger className="h-9 w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-sm">
                  Type
                  {typeFilter.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {typeFilter.length}
                    </Badge>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="max-h-72 w-56 overflow-y-auto p-1">
                <ul className="flex flex-col gap-0.5">
                  {EVENT_TYPE_OPTIONS.map((t) => {
                    const active = typeFilter.includes(t.value);
                    return (
                      <li key={t.value}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
                          <Checkbox
                            checked={active}
                            onCheckedChange={() => toggleTypeFilter(t.value)}
                          />
                          <span>{t.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </PopoverContent>
            </Popover>

            {typeFilter.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {typeFilter.map((v) => {
                  const t = EVENT_TYPE_OPTIONS.find((x) => x.value === v);
                  return (
                    <Badge key={v} variant="secondary" className="gap-1 pr-1 text-xs">
                      <span>{t?.label ?? v}</span>
                      <button
                        type="button"
                        onClick={() => toggleTypeFilter(v)}
                        className="rounded-sm p-0.5 hover:bg-background"
                        aria-label={`Remove ${t?.label ?? v}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>

          <DataTable<SerialRow>
            rowData={filtered as SerialRow[]}
            columnDefs={columnDefs}
            getRowId={(params) => params.data.id}
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

function buildConfirmTitle(confirm: ConfirmState): string {
  if (!confirm) return '';
  const verb = confirm.kind === 'delete' ? 'Delete' : 'Archive';
  const n = confirm.targets.length;
  if (n === 1) {
    const name = confirm.targets[0]?.name ?? 'this event';
    return `${verb} "${name}"?`;
  }
  return `${verb} ${n} events?`;
}

interface ViewTabProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly icon: LucideIcon;
  readonly children: React.ReactNode;
}
function ViewTab({ active, onClick, icon: Icon, children }: ViewTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

interface RowActionsProps {
  readonly row: SerialRow;
  readonly onPublish: (r: SerialRow) => void;
  readonly onEdit: (r: SerialRow) => void;
  readonly onArchive: (r: SerialRow) => void;
  readonly onDelete: (r: SerialRow) => void;
}
function RowActions({ row, onPublish, onEdit, onArchive, onDelete }: RowActionsProps) {
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
        <DropdownMenuItem onSelect={() => onEdit(row)}>
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
