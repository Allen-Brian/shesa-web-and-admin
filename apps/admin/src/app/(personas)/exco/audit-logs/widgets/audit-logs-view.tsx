'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ScrollText } from 'lucide-react';

import { Badge, Button, cn } from '@shesa/ui';

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

/**
 * Audit Logs view — sorted-newest-first list with click-to-expand rows.
 * Each row shows a human summary line; expanded, it renders the full
 * metadata JSON + IP + user agent.
 *
 * Filters:
 *   - free-text search across action + actor + entity table
 *   - action prefix picker (e.g. everything under `role.*`)
 */
export function AuditLogsView({ scope, rows, limit }: AuditLogsViewProps) {
  const [search, setSearch] = useState('');
  const [prefix, setPrefix] = useState<string>('__all');
  const [openId, setOpenId] = useState<string | null>(null);

  const prefixes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const head = r.action.split('.')[0];
      if (head) set.add(head);
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (prefix !== '__all' && !r.action.startsWith(prefix + '.') && r.action !== prefix)
        return false;
      if (!q) return true;
      if (r.action.toLowerCase().includes(q)) return true;
      if (r.actor_label.toLowerCase().includes(q)) return true;
      if (r.actor_email?.toLowerCase().includes(q)) return true;
      if (r.entity_table.toLowerCase().includes(q)) return true;
      if (r.entity_schema.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rows, search, prefix]);

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
          Last {limit} events at {scope.name}. Newest first.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search action, actor, entity…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
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
        <span className="text-xs text-muted-foreground">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No entries match the current filter.
          </div>
        )}
        {filtered.map((r) => (
          <Row
            key={r.id}
            row={r}
            open={openId === r.id}
            onToggle={() => setOpenId(openId === r.id ? null : r.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  row,
  open,
  onToggle,
}: {
  readonly row: AuditEntryRow;
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  const dt = new Date(row.created_at);
  const dateLabel = dt.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  const timeLabel = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const [tone, hint] = actionTone(row.action);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30',
          open && 'bg-muted/40',
        )}
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
          <div>{dateLabel}</div>
          <div>{timeLabel}</div>
        </span>
        <span className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-foreground">{row.action}</span>
            <Badge variant="outline" className={tone}>
              {hint}
            </Badge>
            {row.entity_id && (
              <span className="rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {row.entity_schema}.{row.entity_table}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            <span className="text-foreground/80">{row.actor_label}</span>
            {row.actor_email && row.actor_email !== row.actor_label && (
              <>
                {' · '}
                <span className="font-mono">{row.actor_email}</span>
              </>
            )}
          </div>
        </span>
      </button>

      {open && (
        <div className="grid gap-3 border-t border-border bg-muted/10 px-4 py-3 sm:grid-cols-2">
          <Detail k="Entity ID" v={row.entity_id ?? '—'} mono />
          <Detail k="IP" v={row.ip_address ?? '—'} mono />
          <Detail k="User Agent" v={row.user_agent ?? '—'} mono />
          <Detail k="Created" v={dt.toLocaleString()} />
          <div className="sm:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Metadata
            </div>
            <pre className="mt-1 max-h-64 overflow-auto rounded-md border border-border bg-background p-3 text-xs">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
              Collapse
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {k}
      </span>
      <span className={mono ? 'font-mono text-xs text-foreground' : 'text-sm text-foreground'}>
        {v}
      </span>
    </div>
  );
}

/**
 * Rough action → tone mapping so the log reads at a glance. Never fatal
 * to be wrong — falls back to a neutral badge.
 */
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
