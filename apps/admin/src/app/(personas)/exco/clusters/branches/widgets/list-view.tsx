'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Country } from 'country-state-city';
import {
  Archive,
  ChevronRight,
  CornerDownRight,
  Globe,
  Home,
  MoreHorizontal,
  Pencil,
  RotateCcw,
} from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EntityTablePanel,
  Switch,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';

import type { ScopeStatus } from '@/components/clusters/cluster-list';
import { HOME_COUNTRY_CODE, isDiaspora } from '@/lib/country-currency';

import { archiveBranch, restoreBranch } from '../actions';
import type { BranchInitialValues } from './branch-form';
import { BranchFormDialog } from './branch-form-dialog';

export interface BranchRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly currency_code: string;
  readonly country_code: string;
  readonly region: string;
  readonly city: string;
  readonly nickname: string | null;
  readonly chapter_count: number;
  readonly autonomous_chapter_count: number;
  readonly member_count: number;
  readonly [key: string]: unknown;
}

export interface ChapterRow {
  readonly id: string;
  readonly parent_id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly chapter_kind: 'autonomous' | 'grouping';
  readonly country_code: string;
  readonly region: string;
  readonly city: string;
  readonly member_count: number;
}

// Unified row for AG Grid — discriminated by `_kind`. Chapter rows only
// appear when their parent branch's disclosure is toggled open.
type SerialRow = {
  readonly serial: number | null;
  readonly _kind: 'branch' | 'chapter';
  readonly _parent_id: string | null;
  readonly _parent_slug: string | null;
  readonly _has_children: boolean;
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly country_code: string;
  readonly region: string;
  readonly city: string;
  readonly nickname: string | null;
  readonly chapter_count: number | null;
  readonly member_count: number;
  readonly chapter_kind: 'autonomous' | 'grouping' | null;
  readonly currency_code: string;
};

type ConfirmState = null | {
  readonly kind: 'archive' | 'restore';
  readonly targets: readonly SerialRow[];
};

interface BranchesListViewProps {
  readonly data: readonly BranchRow[];
  readonly chapters: readonly ChapterRow[];
  readonly canCreate: boolean;
}

export function BranchesListView({ data, chapters, canCreate }: BranchesListViewProps) {
  const router = useRouter();
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [dialogState, setDialogState] = useState<
    | { readonly mode: 'create' }
    | { readonly mode: 'edit'; readonly initial: BranchInitialValues }
    | null
  >(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [, startTransition] = useTransition();

  // "archived" is the soft-delete state. Hide those rows by default so the
  // day-to-day view doesn't mix live and retired scopes. Users opt into
  // the archived set with the "Show archived" toggle to restore them.
  const visibleBranches = useMemo(
    () => (showArchived ? data : data.filter((b) => b.status !== 'archived')),
    [data, showArchived],
  );
  const visibleChapters = useMemo(
    () => (showArchived ? chapters : chapters.filter((c) => c.status !== 'archived')),
    [chapters, showArchived],
  );

  const chaptersByBranch = useMemo(() => {
    const map = new Map<string, ChapterRow[]>();
    for (const c of visibleChapters) {
      const bucket = map.get(c.parent_id) ?? [];
      bucket.push(c);
      map.set(c.parent_id, bucket);
    }
    return map;
  }, [visibleChapters]);

  const toggleExpanded = useCallback((branchId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  }, []);

  // Flatten branches into display rows, inserting each branch's chapters
  // immediately after when its row is expanded. Serial numbers only apply
  // to branches so they stay stable when a branch is opened.
  const displayed = useMemo<readonly SerialRow[]>(() => {
    const out: SerialRow[] = [];
    visibleBranches.forEach((b, index) => {
      const children = chaptersByBranch.get(b.id) ?? [];
      out.push({
        serial: index + 1,
        _kind: 'branch',
        _parent_id: null,
        _parent_slug: null,
        _has_children: children.length > 0,
        id: b.id,
        name: b.name,
        slug: b.slug,
        status: b.status,
        country_code: b.country_code,
        region: b.region,
        city: b.city,
        nickname: b.nickname,
        chapter_count: b.chapter_count,
        member_count: b.member_count,
        chapter_kind: null,
        currency_code: b.currency_code,
      });
      if (!expanded.has(b.id)) return;
      for (const c of children) {
        out.push({
          serial: null,
          _kind: 'chapter',
          _parent_id: c.parent_id,
          _parent_slug: b.slug,
          _has_children: false,
          id: c.id,
          name: c.name,
          slug: c.slug,
          status: c.status,
          country_code: c.country_code,
          region: c.region,
          city: c.city,
          nickname: null,
          chapter_count: null,
          member_count: c.member_count,
          chapter_kind: c.chapter_kind,
          currency_code: '',
        });
      }
    });
    return out;
  }, [visibleBranches, chaptersByBranch, expanded]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayed;
    return displayed.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.city.toLowerCase().includes(q)) return true;
      if (r.region.toLowerCase().includes(q)) return true;
      if (r.country_code.toLowerCase().includes(q)) return true;
      if (r.nickname?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [displayed, search]);

  const openCreate = () => setDialogState({ mode: 'create' });
  const openEdit = (row: SerialRow) =>
    setDialogState({
      mode: 'edit',
      initial: {
        scopeId: row.id,
        name: row.name,
        slug: row.slug,
        nickname: row.nickname,
        countryCode: row.country_code,
        region: row.region,
        city: row.city,
        currencyCode: row.currency_code,
      },
    });

  const runMutation = (targets: readonly SerialRow[], kind: 'archive' | 'restore') => {
    startTransition(async () => {
      const fn = kind === 'archive' ? archiveBranch : restoreBranch;
      const results = await Promise.all(targets.map((t) => fn(t.id)));
      const failed = results.filter((r) => !r.ok);
      const doneVerb = kind === 'archive' ? 'Archived' : 'Restored';
      if (failed.length === 0) {
        toast.success(`${doneVerb} ${targets.length} branch${targets.length === 1 ? '' : 'es'}.`);
      } else if (failed.length === targets.length) {
        toast.error(failed[0]?.message ?? `Could not ${kind}.`);
      } else {
        toast.error(`${doneVerb} ${targets.length - failed.length}; ${failed.length} failed.`);
      }
      router.refresh();
    });
  };

  const columnDefs = useMemo<ColDef<SerialRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 96,
        maxWidth: 96,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<SerialRow, number | null>) =>
          params.data ? (
            <SerialCell
              row={params.data}
              isExpanded={expanded.has(params.data.id)}
              onToggle={toggleExpanded}
            />
          ) : null,
      },
      {
        headerName: 'Name',
        field: 'name',
        flex: 3,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams<SerialRow, string>) =>
          params.data ? <NameCell row={params.data} /> : null,
      },
      {
        headerName: 'Country',
        field: 'country_code',
        flex: 2,
        minWidth: 180,
        cellRenderer: (params: ICellRendererParams<SerialRow, string>) => (
          <CountryCell iso2={params.value ?? ''} />
        ),
      },
      { headerName: 'Region', field: 'region', flex: 2, minWidth: 140 },
      {
        headerName: 'Chapters',
        field: 'chapter_count',
        flex: 0.7,
        minWidth: 100,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        headerClass: 'ag-center-aligned-header',
        valueFormatter: (p) => (p.value == null ? '—' : String(p.value)),
      },
      {
        headerName: 'Members',
        field: 'member_count',
        flex: 0.7,
        minWidth: 100,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        headerClass: 'ag-center-aligned-header',
      },
      {
        headerName: 'Territory',
        field: 'country_code',
        colId: 'territory',
        flex: 1,
        minWidth: 130,
        cellRenderer: (params: ICellRendererParams<SerialRow, string>) => (
          <TerritoryText iso2={params.value ?? ''} />
        ),
      },
      {
        headerName: 'Status',
        field: 'status',
        flex: 0.8,
        minWidth: 110,
        cellRenderer: (params: ICellRendererParams<SerialRow, ScopeStatus>) => (
          <StatusPill status={params.value ?? 'active'} />
        ),
      },
      {
        headerName: '',
        colId: 'actions',
        width: 64,
        maxWidth: 64,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<SerialRow>) => {
          if (!params.data) return null;
          // Chapter-level actions are managed from the chapter detail page.
          if (params.data._kind === 'chapter') return null;
          return (
            <RowActions
              row={params.data}
              onEdit={openEdit}
              onArchive={(r) => setConfirm({ kind: 'archive', targets: [r] })}
              onRestore={(r) => setConfirm({ kind: 'restore', targets: [r] })}
            />
          );
        },
      },
    ],
    [expanded, toggleExpanded],
  );

  const handleRowClicked = (e: RowClickedEvent<SerialRow>) => {
    if (!e.data) return;
    if (e.data._kind === 'chapter') {
      router.push(`/exco/clusters/branches/${e.data._parent_slug}/chapters/${e.data.slug}`);
      return;
    }
    router.push(`/exco/clusters/branches/${e.data.slug}`);
  };

  const massActions = useMemo<MassActions<SerialRow>>(
    () => ({
      itemName: 'branch',
      pluralItemName: 'branches',
      onArchive: (selected) => setConfirm({ kind: 'archive', targets: selected }),
    }),
    [],
  );

  const archivedCount =
    data.filter((b) => b.status === 'archived').length +
    chapters.filter((c) => c.status === 'archived').length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'branch' : 'branches'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        onCreate={openCreate}
        createLabel="Create New Branch"
        filters={
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={showArchived}
              onCheckedChange={setShowArchived}
              aria-label="Show archived"
            />
            <span>
              Show archived
              {archivedCount > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  {archivedCount}
                </span>
              )}
            </span>
          </label>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={handleRowClicked}
        showColumnPicker={false}
        massActions={massActions}
      />

      {dialogState && (
        <BranchFormDialog
          open
          onOpenChange={(o) => {
            if (!o) setDialogState(null);
          }}
          mode={dialogState.mode}
          initial={dialogState.mode === 'edit' ? dialogState.initial : undefined}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirmTitle(confirm)}
        description={
          confirm?.kind === 'restore'
            ? 'The branch will return to the active list and become available in dropdowns again.'
            : 'Archived branches disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them. Toggle "Show archived" to restore later.'
        }
        confirmLabel={confirm?.kind === 'restore' ? 'Restore' : 'Archive'}
        onConfirm={() => {
          if (!confirm) return;
          const { kind, targets } = confirm;
          setConfirm(null);
          runMutation(targets, kind);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function confirmTitle(confirm: ConfirmState): string {
  if (!confirm) return '';
  const verb = confirm.kind === 'restore' ? 'Restore' : 'Archive';
  const n = confirm.targets.length;
  if (n === 1) return `${verb} ${confirm.targets[0]?.name ?? 'this branch'}?`;
  return `${verb} ${n} branches?`;
}

function CountryCell({ iso2 }: { readonly iso2: string }) {
  const country = iso2 ? Country.getCountryByCode(iso2) : null;
  if (!country) return <span className="text-muted-foreground">{iso2 || '—'}</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="text-base">{country.flag}</span>
      <span className="truncate">{country.name}</span>
    </span>
  );
}

function TerritoryText({ iso2 }: { readonly iso2: string }) {
  if (!iso2) return <span className="text-muted-foreground">—</span>;
  const away = isDiaspora(iso2);
  if (!away) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <Home className="h-3.5 w-3.5" />
        Home
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sky-700 dark:text-sky-300">
      <Globe className="h-3.5 w-3.5" />
      Diaspora
    </span>
  );
}

function SerialCell({
  row,
  isExpanded,
  onToggle,
}: {
  readonly row: SerialRow;
  readonly isExpanded: boolean;
  readonly onToggle: (branchId: string) => void;
}) {
  if (row._kind === 'chapter') {
    return <span className="text-muted-foreground" aria-hidden />;
  }
  return (
    <span className="flex items-center gap-1.5">
      {row._has_children ? (
        <button
          type="button"
          aria-label={isExpanded ? 'Collapse chapters' : 'Expand chapters'}
          aria-expanded={isExpanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(row.id);
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>
      ) : (
        <span className="inline-block h-6 w-6" aria-hidden />
      )}
      <span>{row.serial}</span>
    </span>
  );
}

function NameCell({ row }: { readonly row: SerialRow }) {
  if (row._kind === 'chapter') {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <CornerDownRight className="h-3.5 w-3.5 opacity-60" />
        <span className="text-foreground">{row.name}</span>
      </span>
    );
  }
  return <span>{row.name}</span>;
}

function StatusPill({ status }: { readonly status: ScopeStatus }) {
  const styles: Record<ScopeStatus, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    inactive: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    archived: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  };
  const label: Record<ScopeStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    archived: 'Archived',
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {label[status]}
    </Badge>
  );
}

function RowActions({
  row,
  onEdit,
  onArchive,
  onRestore,
}: {
  readonly row: SerialRow;
  readonly onEdit: (row: SerialRow) => void;
  readonly onArchive: (row: SerialRow) => void;
  readonly onRestore: (row: SerialRow) => void;
}) {
  const isArchived = row.status === 'archived';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-md p-0"
          aria-label="Row actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onEdit(row)}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {isArchived ? (
          <DropdownMenuItem onClick={() => onRestore(row)}>
            <RotateCcw className="h-4 w-4" />
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onArchive(row)}
          >
            <Archive className="h-4 w-4" />
            Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Retained to satisfy the eslint no-unused-vars on the imported constant
// — used for narrowing in tests / future filters.
void HOME_COUNTRY_CODE;
