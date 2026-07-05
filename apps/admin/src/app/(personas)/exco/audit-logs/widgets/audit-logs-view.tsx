'use client';

import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';

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

/**
 * Audit Logs table — same DataTable pattern as the rest of the admin.
 * Row click opens a details dialog with the full metadata + IP + UA.
 * Panel-based filter: free-text search + action prefix dropdown.
 */
export function AuditLogsView({ scope, rows, limit }: AuditLogsViewProps) {
  const [search, setSearch] = useState('');
  const [prefix, setPrefix] = useState<string>('__all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [selected, setSelected] = useState<AuditEntryRow | null>(null);

  const prefixes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const head = r.action.split('.')[0];
      if (head) set.add(head);
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (prefix !== '__all' && !r.action.startsWith(prefix + '.') && r.action !== prefix)
          return false;
        if (!q) return true;
        if (r.action.toLowerCase().includes(q)) return true;
        if (r.actor_label.toLowerCase().includes(q)) return true;
        if (r.actor_email?.toLowerCase().includes(q)) return true;
        if (r.entity_table.toLowerCase().includes(q)) return true;
        if (r.entity_schema.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rows, search, prefix]);

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
        headerName: 'When',
        field: 'created_at',
        width: 170,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
      },
      {
        headerName: 'Actor',
        field: 'actor_label',
        flex: 1.5,
        minWidth: 180,
      },
      {
        headerName: 'Action',
        field: 'action',
        flex: 1.5,
        minWidth: 200,
        cellClass: 'font-mono text-xs',
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <ActionCell action={p.value ?? ''} />
        ),
      },
      {
        headerName: 'Entity',
        colId: 'entity',
        flex: 1.5,
        minWidth: 180,
        valueGetter: (p) => (p.data ? `${p.data.entity_schema}.${p.data.entity_table}` : ''),
        cellClass: 'font-mono text-xs',
      },
      {
        headerName: 'IP',
        field: 'ip_address',
        width: 140,
        cellClass: 'font-mono text-xs',
        valueFormatter: (p) => p.value ?? '—',
      },
    ],
    [],
  );

  const onRowClicked = (e: RowClickedEvent<SerialRow>) => {
    if (!e.data) return;
    setSelected(e.data);
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
        filters={
          <select
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
          >
            <option value="__all">All actions</option>
            {prefixes.map((p) => (
              <option key={p} value={p}>
                {p}.*
              </option>
            ))}
          </select>
        }
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-mono text-sm">
                  <ActionCell action={selected.action} />
                </DialogTitle>
                <DialogDescription>
                  {new Date(selected.created_at).toLocaleString()} · {selected.actor_label}
                  {selected.actor_email && selected.actor_email !== selected.actor_label && (
                    <>
                      {' · '}
                      <span className="font-mono">{selected.actor_email}</span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <Detail k="Entity" v={`${selected.entity_schema}.${selected.entity_table}`} mono />
                <Detail k="Entity ID" v={selected.entity_id ?? '—'} mono />
                <Detail k="IP" v={selected.ip_address ?? '—'} mono />
                <Detail k="User Agent" v={selected.user_agent ?? '—'} mono />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Metadata
                </div>
                <pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end">
                <Button type="button" size="sm" variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionCell({ action }: { readonly action: string }) {
  const [tone, hint] = actionTone(action);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-sm text-foreground">{action}</span>
      <Badge variant="outline" className={tone}>
        {hint}
      </Badge>
    </span>
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

function actionTone(action: string): readonly [string, string] {
  if (action.startsWith('role.granted') || action.startsWith('membership.approved'))
    return [
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      'grant',
    ];
  if (
    action.startsWith('role.revoked') ||
    action.startsWith('membership.rejected') ||
    action.endsWith('.deleted') ||
    action.endsWith('.archived')
  )
    return ['border-destructive/40 bg-destructive/10 text-destructive', 'revoke'];
  if (action.startsWith('membership.transferred') || action.startsWith('scope.updated'))
    return ['border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300', 'change'];
  if (action.startsWith('audit.') || action.startsWith('auth.'))
    return ['border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300', 'system'];
  return ['border-border bg-background text-foreground', 'event'];
}
