'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleDollarSign, Ticket, Target as TargetIcon, Users } from 'lucide-react';

import {
  Badge,
  DataTable,
  EntityTablePanel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatsCard,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

export interface ContributionRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly scopeName: string;
  readonly shape: string;
  readonly goalAmount: number | null;
  readonly baseAmount: number | null;
  readonly currency: string;
  readonly lifecycle: string | null;
  readonly openDate: string | null;
  readonly closeDate: string | null;
  readonly capacity: number | null;
  readonly raised: number;
  readonly contributorCount: number;
}

type SerialRow = ContributionRow & { readonly serial: number };
type LifecycleFilter = 'all' | 'draft' | 'open' | 'closed' | 'archived';
type ShapeFilter = 'all' | 'goal' | 'open' | 'ticketed' | 'fixed';

interface Props {
  readonly rows: readonly ContributionRow[];
}

// Shape icon + short label, mirrors the way charges surface shape.
const SHAPE_META: Record<string, { icon: typeof TargetIcon; label: string }> = {
  goal: { icon: TargetIcon, label: 'Goal' },
  open: { icon: CircleDollarSign, label: 'Open' },
  ticketed: { icon: Ticket, label: 'Ticketed' },
  fixed: { icon: CircleDollarSign, label: 'Fixed' },
};

export function ExcoContributionsView({ rows }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all');
  const [shapeFilter, setShapeFilter] = useState<ShapeFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (lifecycleFilter !== 'all' && r.lifecycle !== lifecycleFilter) return false;
        if (shapeFilter !== 'all' && r.shape !== shapeFilter) return false;
        if (!q) return true;
        if (r.name.toLowerCase().includes(q)) return true;
        if (r.scopeName.toLowerCase().includes(q)) return true;
        if (r.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rows, search, lifecycleFilter, shapeFilter]);

  // KPI totals — compute once from the full row set (not the filtered
  // slice) so the strip stays stable while operators sift.
  const totals = useMemo(() => {
    let raised = 0;
    let goalSum = 0;
    let contributors = 0;
    let open = 0;
    let closed = 0;
    let draft = 0;
    for (const r of rows) {
      raised += r.raised;
      contributors += r.contributorCount;
      if (r.goalAmount) goalSum += r.goalAmount;
      if (r.lifecycle === 'open') open += 1;
      else if (r.lifecycle === 'closed') closed += 1;
      else if (r.lifecycle === 'draft') draft += 1;
    }
    // Show a portfolio-level coverage percent when at least one goal-type
    // contribution exists; otherwise it's misleading so we hide it.
    const coverage = goalSum > 0 ? Math.min(100, Math.round((raised / goalSum) * 100)) : null;
    return { raised, contributors, open, closed, draft, coverage, goalSum };
  }, [rows]);

  const columnDefs = useMemo<ColDef<SerialRow>[]>(
    () => [
      {
        headerName: '#',
        field: 'serial',
        width: 56,
        maxWidth: 56,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Name',
        field: 'name',
        flex: 2,
        minWidth: 240,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const shape = SHAPE_META[p.data.shape] ?? SHAPE_META.open!;
          const ShapeIcon = shape.icon;
          return (
            <div className="flex h-full items-center gap-2 py-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShapeIcon className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">{p.data.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {p.data.scopeName} · {shape.label}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Progress',
        colId: 'progress',
        flex: 1.6,
        minWidth: 220,
        valueGetter: (p) => {
          const r = p.data as SerialRow | undefined;
          if (!r) return 0;
          if (r.goalAmount && r.goalAmount > 0) return r.raised / r.goalAmount;
          return r.raised;
        },
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          return <ProgressCell row={p.data} />;
        },
      },
      {
        headerName: 'Contributors',
        field: 'contributorCount',
        width: 130,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          return (
            <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-foreground">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {p.data.contributorCount.toLocaleString()}
            </span>
          );
        },
      },
      {
        headerName: 'Closes',
        field: 'closeDate',
        width: 130,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
      {
        headerName: 'Lifecycle',
        field: 'lifecycle',
        width: 120,
        cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
          <LifecycleBadge lifecycle={p.value ?? ''} />
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Contributions" value={rows.length} />
        <StatsCard
          label="Raised"
          value={`${new Intl.NumberFormat().format(Math.round(totals.raised))} ${rows[0]?.currency ?? ''}`.trim()}
        />
        <StatsCard label="Contributors" value={totals.contributors.toLocaleString()} />
        <StatsCard label="Open" value={totals.open} />
        <StatsCard
          label="Portfolio coverage"
          value={totals.coverage !== null ? `${totals.coverage}%` : '—'}
        />
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'contribution' : 'contributions'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
        filters={
          <div className="flex items-center gap-2">
            <Select value={shapeFilter} onValueChange={(v) => setShapeFilter(v as ShapeFilter)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shapes</SelectItem>
                <SelectItem value="goal">Goal</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="ticketed">Ticketed</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={lifecycleFilter}
              onValueChange={(v) => setLifecycleFilter(v as LifecycleFilter)}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All lifecycles</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e) => e.data && router.push(`/exco/finance-view/charges/${e.data.id}`)}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}

// ─── Progress cell ──────────────────────────────────────────────────
//
// Goal-shape contributions get a bar + %. Other shapes (open,
// ticketed, fixed) just show the amount raised — no goal to divide by.
// A tooltip-style popover on click surfaces the raw numbers so admins
// don't have to open the drill-down for a quick check.

function ProgressCell({ row }: { readonly row: SerialRow }) {
  const hasGoal = row.goalAmount != null && row.goalAmount > 0;
  const percent = hasGoal
    ? Math.min(100, Math.round((row.raised / (row.goalAmount ?? 1)) * 100))
    : null;
  const barColor =
    percent === null
      ? 'bg-primary'
      : percent >= 100
        ? 'bg-emerald-500'
        : percent >= 70
          ? 'bg-sky-500'
          : percent >= 40
            ? 'bg-amber-500'
            : 'bg-destructive';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex w-full flex-col gap-1 py-1 text-left"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground tabular-nums">
              {new Intl.NumberFormat().format(Math.round(row.raised))} {row.currency}
            </span>
            {hasGoal ? (
              <span className="text-muted-foreground tabular-nums">
                of {new Intl.NumberFormat().format(row.goalAmount!)}
                {percent !== null && (
                  <span
                    className={`ml-1 font-medium ${
                      percent >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                    }`}
                  >
                    · {percent}%
                  </span>
                )}
              </span>
            ) : row.baseAmount ? (
              <span className="text-muted-foreground tabular-nums">
                unit {new Intl.NumberFormat().format(row.baseAmount)}
              </span>
            ) : (
              <span className="text-muted-foreground">no goal set</span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{
                width: `${percent ?? Math.min(100, (row.raised / Math.max(1, row.baseAmount ?? row.raised)) * 100)}%`,
              }}
            />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-3 text-xs">
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-foreground">{row.name}</span>
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Raised</span>
            <span className="text-foreground tabular-nums">
              {new Intl.NumberFormat().format(Math.round(row.raised))} {row.currency}
            </span>
          </div>
          {hasGoal && (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">Goal</span>
                <span className="text-foreground tabular-nums">
                  {new Intl.NumberFormat().format(row.goalAmount!)} {row.currency}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span
                  className={`tabular-nums ${
                    row.raised >= (row.goalAmount ?? 0)
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-foreground'
                  }`}
                >
                  {new Intl.NumberFormat().format(Math.max(0, (row.goalAmount ?? 0) - row.raised))}{' '}
                  {row.currency}
                </span>
              </div>
            </>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Contributors</span>
            <span className="text-foreground tabular-nums">
              {row.contributorCount.toLocaleString()}
            </span>
          </div>
          {row.capacity != null && (
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Capacity</span>
              <span className="text-foreground tabular-nums">{row.capacity}</span>
            </div>
          )}
          {row.closeDate && (
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Closes</span>
              <span className="text-foreground">
                {new Date(row.closeDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LifecycleBadge({ lifecycle }: { readonly lifecycle: string }) {
  const styles: Record<string, string> = {
    draft: 'border-border bg-muted/40 text-foreground',
    open: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    closed: 'border-border bg-muted/40 text-muted-foreground',
    archived: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  };
  return (
    <Badge variant="outline" className={`capitalize ${styles[lifecycle] ?? styles.draft}`}>
      {lifecycle || '—'}
    </Badge>
  );
}
