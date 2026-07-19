'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import { Badge, Button, DataTable, Input, type ColDef, type ICellRendererParams } from '@shesa/ui';

import type { ChargeDetailPoolProps, PoolRow } from './charge-detail-types';
import { downloadCsv, formatMethod, formatMoney, getInitials, slugify } from './shared-formatters';

/**
 * Flat payments table for pool-shape charges (goal / open / ticketed
 * contributions where the money hits the charge directly, not a
 * per-member obligation). Search filters on payer label; CSV export
 * writes the raw log.
 */
export function ChargePoolTable({ summary, poolPayments }: ChargeDetailPoolProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo<readonly PoolRow[]>(() => {
    const q = search.trim().toLowerCase();
    return poolPayments
      .filter((p) => (q ? p.payerLabel.toLowerCase().includes(q) : true))
      .map((p, i) => ({ ...p, serial: i + 1 }));
  }, [poolPayments, search]);

  const columnDefs = useMemo<ColDef<PoolRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 68,
        maxWidth: 68,
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Payer',
        field: 'payerLabel',
        flex: 1.5,
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams<PoolRow>) =>
          p.data ? (
            <div className="flex h-full items-center gap-2.5 py-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {getInitials(p.data.payerLabel)}
              </div>
              <span className="truncate text-sm font-medium text-foreground">
                {p.data.payerLabel}
              </span>
            </div>
          ) : null,
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 160,
        cellRenderer: (p: ICellRendererParams<PoolRow>) => {
          if (!p.data) return null;
          return (
            <span
              className={`text-sm tabular-nums ${
                p.data.isReversal ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
              }`}
            >
              {p.data.isReversal ? '-' : ''}
              {formatMoney(p.data.amount, p.data.currency)}
            </span>
          );
        },
      },
      {
        headerName: 'Method',
        field: 'method',
        width: 140,
        valueFormatter: (p) => formatMethod(p.value ?? ''),
      },
      {
        headerName: 'Source',
        field: 'source',
        width: 110,
        cellRenderer: (p: ICellRendererParams<PoolRow, string>) => (
          <Badge
            variant="outline"
            className={
              p.value === 'auto'
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                : 'border-border text-foreground'
            }
          >
            {p.value === 'auto' ? 'Auto' : 'Manual'}
          </Badge>
        ),
      },
      {
        headerName: 'When',
        field: 'createdAt',
        width: 180,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
      },
    ],
    [],
  );

  const exportCsv = () => {
    const header = ['Payer', 'Amount', 'Currency', 'Method', 'Source', 'Reversal', 'When'];
    const rows: string[][] = poolPayments.map((p) => [
      p.payerLabel,
      p.amount.toFixed(2),
      p.currency,
      formatMethod(p.method),
      p.source === 'auto' ? 'Auto' : 'Manual',
      p.isReversal ? 'Yes' : 'No',
      p.createdAt,
    ]);
    downloadCsv(`${slugify(summary.name)}-payments`, [header, ...rows]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          type="search"
          placeholder="Search payers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {poolPayments.length}{' '}
            {poolPayments.length === 1 ? 'payment' : 'payments'}
          </span>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>
      <DataTable<PoolRow>
        rowData={filtered as PoolRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}
