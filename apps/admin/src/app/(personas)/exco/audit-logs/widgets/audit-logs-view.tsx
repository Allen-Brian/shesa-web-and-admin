'use client';

import { useMemo, useState } from 'react';

import { EntityTablePanel, type GridApi } from '@shesa/ui';

import { AuditLogsHeader } from './audit-logs-header';
import { AuditLogsKpiStrip, type AuditKpis } from './audit-logs-kpi-strip';
import { AuditLogsTable } from './audit-logs-table';
import { CategoryChipRow } from './category-chip-row';
import { WINDOW_MS } from './audit-log-constants';
import { DetailsDialog } from './details-dialog';
import { ExportCsvButton } from './export-csv-button';
import { categorize } from './audit-log-helpers';
import type {
  AuditEntryRow,
  AuditScope,
  CategoryFilter,
  SerialRow,
  WindowFilter,
} from './audit-log-widget-types';
import { WindowSelect } from './window-select';

export type { AuditEntryRow } from './audit-log-widget-types';

interface AuditLogsViewProps {
  readonly scope: AuditScope;
  readonly rows: readonly AuditEntryRow[];
  readonly limit: number;
}

/**
 * Audit Logs — "who did what, when" per ADR-0041.
 *
 * Mainstream personnel (Global Admin / Mainstream Finance) see Mainstream
 * entries only. Branch admins see their branch's entries. Scoping is
 * enforced upstream in `page.tsx`; this widget is a pure view.
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

  // Full-set KPIs — stay stable while the operator sifts filters.
  const kpis = useMemo<AuditKpis>(() => {
    let grants = 0;
    let revokes = 0;
    let changes = 0;
    const actors = new Set<string>();
    for (const r of rows) {
      const cat = categorize(r.action);
      if (cat === 'grant') grants += 1;
      else if (cat === 'revoke') revokes += 1;
      else if (cat === 'change') changes += 1;
      if (r.actor_label !== '(system)') actors.add(r.actor_label);
    }
    return { total: rows.length, actors: actors.size, grants, revokes, changes };
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <AuditLogsHeader scope={scope} limit={limit} />

      <AuditLogsKpiStrip kpis={kpis} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CategoryChipRow category={category} onChange={setCategory} counts={filterCounts} />
        <div className="flex items-center gap-2">
          <WindowSelect value={windowKey} onChange={setWindowKey} />
          <ExportCsvButton rows={filtered} scopeSlug={scope.slug} />
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

      <AuditLogsTable rows={filtered} onRowClick={setSelected} onGridReady={setGridApi} />

      <DetailsDialog entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
