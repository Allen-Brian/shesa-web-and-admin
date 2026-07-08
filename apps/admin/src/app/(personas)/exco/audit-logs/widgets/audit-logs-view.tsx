'use client';

import { useMemo, useState } from 'react';
import { Activity, Check, Copy, Download, ScrollText } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EntityTablePanel,
  GradientPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatsCard,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type RowClickedEvent,
} from '@shesa/ui';

export interface AuditEntryRow {
  readonly id: string;
  readonly actor_label: string;
  readonly actor_email: string | null;
  readonly action: string;
  readonly entity_schema: string;
  readonly entity_table: string;
  readonly entity_id: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly ip_address: string | null;
  readonly user_agent: string | null;
  readonly created_at: string;
}

interface AuditLogsViewProps {
  readonly scope: {
    readonly id: string;
    readonly slug: string;
    readonly name: string;
    readonly scope_type: 'mainstream' | 'branch' | 'chapter' | 'batch' | 'house' | 'network';
  };
  readonly rows: readonly AuditEntryRow[];
  readonly limit: number;
}

type SerialRow = AuditEntryRow & { readonly serial: number };
type CategoryFilter = 'all' | 'grant' | 'revoke' | 'change' | 'system' | 'event';
type WindowFilter = 'all' | '24h' | '7d' | '30d';

const CATEGORY_META: Record<CategoryFilter, { label: string; tone: string }> = {
  all: { label: 'All', tone: '' },
  grant: {
    label: 'Grants',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  revoke: {
    label: 'Revokes',
    tone: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  change: {
    label: 'Changes',
    tone: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  system: {
    label: 'System',
    tone: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  event: { label: 'Other', tone: 'border-border bg-muted/30 text-foreground' },
};

const WINDOW_MS: Record<WindowFilter, number | null> = {
  all: null,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

/**
 * Audit Logs — the "who did what, when" compliance surface.
 *
 * Layout:
 *   • Header with scope context.
 *   • KPI strip: total events, actor count, grants, revokes.
 *   • 24-hour activity pulse — hourly area chart that flags spikes at
 *     a glance (surges of grants / revokes often correlate with
 *     policy changes or incidents).
 *   • Filter chip row for action category — Grants / Revokes / Changes
 *     / System / Other — alongside a time-window Select.
 *   • Table with actor avatar + coloured action pill + entity target.
 *   • Row click opens a Details dialog with metadata + copy-to-clipboard
 *     buttons for entity id, IP, and user agent.
 *   • CSV export button.
 */
export function AuditLogsView({ scope, rows, limit }: AuditLogsViewProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [windowKey, setWindowKey] = useState<WindowFilter>('7d');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [selected, setSelected] = useState<AuditEntryRow | null>(null);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    const windowMs = WINDOW_MS[windowKey];
    const cutoff = windowMs !== null ? Date.now() - windowMs : null;
    return rows
      .filter((r) => {
        if (cutoff !== null) {
          const when = new Date(r.created_at).getTime();
          if (Number.isFinite(when) && when < cutoff) return false;
        }
        if (category !== 'all' && categorize(r.action) !== category) return false;
        if (!q) return true;
        return (
          r.action.toLowerCase().includes(q) ||
          r.actor_label.toLowerCase().includes(q) ||
          (r.actor_email?.toLowerCase().includes(q) ?? false) ||
          r.entity_table.toLowerCase().includes(q) ||
          r.entity_schema.toLowerCase().includes(q) ||
          (r.entity_id?.toLowerCase().includes(q) ?? false)
        );
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rows, search, category, windowKey]);

  // KPI totals — computed from the FULL row set (not the filtered
  // slice) so the strip stays stable while operators sift.
  const kpis = useMemo(() => {
    let grants = 0;
    let revokes = 0;
    let changes = 0;
    let system = 0;
    const actors = new Set<string>();
    for (const r of rows) {
      const cat = categorize(r.action);
      if (cat === 'grant') grants += 1;
      else if (cat === 'revoke') revokes += 1;
      else if (cat === 'change') changes += 1;
      else if (cat === 'system') system += 1;
      if (r.actor_label !== '(system)') actors.add(r.actor_label);
    }
    return { total: rows.length, actors: actors.size, grants, revokes, changes, system };
  }, [rows]);

  const filterCounts = useMemo(() => {
    const buckets: Record<CategoryFilter, number> = {
      all: 0,
      grant: 0,
      revoke: 0,
      change: 0,
      system: 0,
      event: 0,
    };
    const windowMs = WINDOW_MS[windowKey];
    const cutoff = windowMs !== null ? Date.now() - windowMs : null;
    for (const r of rows) {
      if (cutoff !== null) {
        const when = new Date(r.created_at).getTime();
        if (Number.isFinite(when) && when < cutoff) continue;
      }
      buckets.all += 1;
      buckets[categorize(r.action)] += 1;
    }
    return buckets;
  }, [rows, windowKey]);

  // 24-hour activity pulse — hourly bin over the last 24h. Every hour
  // shows even if empty so the chart's shape encodes "quiet vs busy"
  // rather than "no data".
  const pulseData = useMemo(() => {
    const now = new Date();
    const nowHour = new Date(now);
    nowHour.setMinutes(0, 0, 0);
    const buckets: { hour: string; count: number; label: string }[] = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(nowHour.getTime() - i * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 13); // yyyy-MM-ddTHH
      buckets.push({
        hour: key,
        count: 0,
        label: d.getHours().toString().padStart(2, '0') + 'h',
      });
    }
    const cutoff = nowHour.getTime() - 23 * 60 * 60 * 1000;
    const byKey = new Map(buckets.map((b) => [b.hour, b]));
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (!Number.isFinite(t) || t < cutoff) continue;
      const d = new Date(t);
      d.setMinutes(0, 0, 0);
      const key = d.toISOString().slice(0, 13);
      const b = byKey.get(key);
      if (b) b.count += 1;
    }
    return buckets;
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
        headerName: 'When',
        field: 'created_at',
        width: 170,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const d = new Date(p.data.created_at);
          return (
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-foreground tabular-nums">{d.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatRelative(p.data.created_at)}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Actor',
        field: 'actor_label',
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const isSystem = p.data.actor_label === '(system)';
          return (
            <div className="flex h-full items-center gap-2.5 py-1">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  isSystem
                    ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isSystem ? 'SY' : getInitials(p.data.actor_label)}
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">
                  {p.data.actor_label}
                </span>
                {p.data.actor_email && p.data.actor_email !== p.data.actor_label && (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {p.data.actor_email}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Action',
        field: 'action',
        flex: 1.5,
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <ActionCell action={p.value ?? ''} />
        ),
      },
      {
        headerName: 'Entity',
        colId: 'entity',
        flex: 1.4,
        minWidth: 200,
        valueGetter: (p) => (p.data ? `${p.data.entity_schema}.${p.data.entity_table}` : ''),
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          return (
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-foreground">
                {p.data.entity_schema}.{p.data.entity_table}
              </span>
              {p.data.entity_id && (
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                  {p.data.entity_id.slice(0, 8)}…
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'IP',
        field: 'ip_address',
        width: 140,
        cellClass: 'text-xs font-mono',
        valueFormatter: (p) => p.value ?? '—',
      },
    ],
    [],
  );

  const onRowClicked = (e: RowClickedEvent<SerialRow>) => {
    if (!e.data) return;
    setSelected(e.data);
  };

  const exportCsv = () => {
    const header = [
      'When',
      'Actor',
      'Actor email',
      'Action',
      'Category',
      'Entity',
      'Entity id',
      'IP',
      'Metadata',
    ];
    const csvRows: string[][] = filtered.map((r) => [
      r.created_at,
      r.actor_label,
      r.actor_email ?? '',
      r.action,
      categorize(r.action),
      `${r.entity_schema}.${r.entity_table}`,
      r.entity_id ?? '',
      r.ip_address ?? '',
      JSON.stringify(r.metadata),
    ]);
    downloadCsv(`audit-logs-${scope.slug}-${new Date().toISOString().slice(0, 10)}`, [
      header,
      ...csvRows,
    ]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {scope.scope_type === 'mainstream'
            ? 'Mainstream'
            : scope.scope_type === 'chapter'
              ? 'Autonomous chapter'
              : 'Branch'}
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <ScrollText className="h-6 w-6" />
          Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Last {limit} events at {scope.name}. Newest first. Click a row for the full payload.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Events" value={kpis.total} />
        <StatsCard label="Unique actors" value={kpis.actors} />
        <StatsCard label="Grants" value={kpis.grants} />
        <StatsCard label="Revokes" value={kpis.revokes} />
        <StatsCard label="Changes" value={kpis.changes} />
      </div>

      {/* 24h pulse — hourly area chart */}
      <GradientPanel className="flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            Activity pulse · last 24h
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {pulseData.reduce((a, b) => a + b.count, 0)} event
            {pulseData.reduce((a, b) => a + b.count, 0) === 1 ? '' : 's'} this window
          </span>
        </div>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={pulseData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="pulse-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 9 }}
              interval={3}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-popover)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--color-popover-foreground)',
              }}
              labelFormatter={(label) => `${label}`}
              formatter={(value) => [
                typeof value === 'number' ? `${value} event${value === 1 ? '' : 's'}` : '—',
                'Count',
              ]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#pulse-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </GradientPanel>

      {/* Filter chips + window Select + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CategoryChipRow category={category} onChange={setCategory} counts={filterCounts} />
        <div className="flex items-center gap-2">
          <Select value={windowKey} onValueChange={(v) => setWindowKey(v as WindowFilter)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All in view</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'event' : 'events'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={onRowClicked}
        showColumnPicker={false}
        selectable={false}
      />

      <DetailsDialog entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─── Category filter chip row ───────────────────────────────────────

function CategoryChipRow({
  category,
  onChange,
  counts,
}: {
  readonly category: CategoryFilter;
  readonly onChange: (c: CategoryFilter) => void;
  readonly counts: Record<CategoryFilter, number>;
}) {
  const items: readonly CategoryFilter[] = ['all', 'grant', 'change', 'revoke', 'system', 'event'];
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-0.5">
      {items.map((k) => {
        const active = category === k;
        const meta = CATEGORY_META[k];
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {meta.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                active
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {counts[k]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Action cell ────────────────────────────────────────────────────

function ActionCell({ action }: { readonly action: string }) {
  const cat = categorize(action);
  const meta = CATEGORY_META[cat];
  return (
    <span className="inline-flex h-full items-center gap-2">
      <span className="font-mono text-xs text-foreground">{action}</span>
      {meta.tone && (
        <Badge variant="outline" className={`${meta.tone} shrink-0`}>
          {meta.label}
        </Badge>
      )}
    </span>
  );
}

// ─── Details dialog ─────────────────────────────────────────────────

function DetailsDialog({
  entry,
  onClose,
}: {
  readonly entry: AuditEntryRow | null;
  readonly onClose: () => void;
}) {
  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <ActionCell action={entry.action} />
              </DialogTitle>
              <DialogDescription>
                {new Date(entry.created_at).toLocaleString()} · {entry.actor_label}
                {entry.actor_email && entry.actor_email !== entry.actor_label && (
                  <>
                    {' · '}
                    <span>{entry.actor_email}</span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <Detail k="Entity" v={`${entry.entity_schema}.${entry.entity_table}`} mono />
              <DetailCopyable k="Entity ID" v={entry.entity_id} />
              <DetailCopyable k="IP" v={entry.ip_address} />
              <DetailCopyable k="User Agent" v={entry.user_agent} truncate />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Metadata
                </div>
                <CopyButton value={JSON.stringify(entry.metadata, null, 2)} label="Copy JSON" />
              </div>
              <pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
                {JSON.stringify(entry.metadata, null, 2) || '{}'}
              </pre>
            </div>

            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  k,
  v,
  mono,
}: {
  readonly k: string;
  readonly v: string;
  readonly mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {k}
      </span>
      <span
        className={mono ? 'break-all font-mono text-xs text-foreground' : 'text-sm text-foreground'}
      >
        {v}
      </span>
    </div>
  );
}

function DetailCopyable({
  k,
  v,
  truncate,
}: {
  readonly k: string;
  readonly v: string | null;
  readonly truncate?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {k}
        </span>
        {v && <CopyButton value={v} />}
      </div>
      <span
        className={
          truncate
            ? 'truncate font-mono text-xs text-foreground'
            : 'break-all font-mono text-xs text-foreground'
        }
        title={truncate && v ? v : undefined}
      >
        {v ?? '—'}
      </span>
    </div>
  );
}

function CopyButton({ value, label }: { readonly value: string; readonly label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
          toast.success('Copied.');
        } catch {
          toast.error('Copy failed.');
        }
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label ?? 'Copy'}
    </button>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function categorize(action: string): CategoryFilter {
  if (action.startsWith('role.granted') || action.startsWith('membership.approved')) return 'grant';
  if (
    action.startsWith('role.revoked') ||
    action.startsWith('membership.rejected') ||
    action.endsWith('.deleted') ||
    action.endsWith('.archived')
  )
    return 'revoke';
  if (action.startsWith('membership.transferred') || action.startsWith('scope.updated'))
    return 'change';
  if (action.startsWith('audit.') || action.startsWith('auth.')) return 'system';
  return 'event';
}

function getInitials(name: string): string {
  const clean = name.replace(/[()]/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '—';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.round((now - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Simple CSV builder + download.
function downloadCsv(baseName: string, rows: readonly (readonly string[])[]): void {
  const escape = (v: string): string => {
    if (v.includes('"') || v.includes(',') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
