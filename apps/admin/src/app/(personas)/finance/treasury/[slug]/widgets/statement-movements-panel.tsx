'use client';

import { useMemo, useState } from 'react';

import { DataTable, GradientPanel, Input } from '@shesa/ui';

import { buildStatementColumns } from './statement-columns';
import type { DirectionFilter, Entry, SerialEntry } from './statement-types';

/**
 * Movements panel — the DataTable + search + direction filter chip
 * strip. Filter state stays local; the count in the header reflects
 * "filtered of total" so the operator sees at a glance how much the
 * current filter has narrowed the window.
 */
export function StatementMovementsPanel({ entries }: { readonly entries: readonly Entry[] }) {
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');

  const filtered = useMemo<readonly SerialEntry[]>(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (directionFilter !== 'all' && e.direction !== directionFilter) return false;
        if (!q) return true;
        if (e.counterparty.toLowerCase().includes(q)) return true;
        if (e.subtitle.toLowerCase().includes(q)) return true;
        if (e.memo?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((e, i) => ({ ...e, serial: i + 1 }));
  }, [entries, search, directionFilter]);

  const columnDefs = useMemo(() => buildStatementColumns(), []);

  return (
    <GradientPanel className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground">Movements</h2>
          <p className="text-xs text-muted-foreground">
            Every ledger entry in this window. Payments and expenses each write one row here.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {entries.length}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Search payer, charge, memo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64"
        />
        <div className="flex gap-1 rounded-lg border border-border bg-background/60 p-0.5">
          {(['all', 'income', 'expense'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setDirectionFilter(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                directionFilter === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v === 'all' ? 'All' : v === 'income' ? 'Income' : 'Expenses'}
            </button>
          ))}
        </div>
      </div>

      <DataTable<SerialEntry>
        rowData={filtered as SerialEntry[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        showColumnPicker={false}
        selectable={false}
      />
    </GradientPanel>
  );
}
