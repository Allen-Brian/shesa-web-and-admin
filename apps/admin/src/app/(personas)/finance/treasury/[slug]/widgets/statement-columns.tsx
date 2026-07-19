import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { Badge, type ColDef, type ICellRendererParams } from '@shesa/ui';

import type { SerialEntry } from './statement-types';

/**
 * Column defs for the Movements DataTable inside the statement.
 * Direction column reads as a coloured chip; Amount is signed;
 * Via renders auto vs manual with the same colour language used
 * elsewhere in the finance persona.
 */
export function buildStatementColumns(): ColDef<SerialEntry>[] {
  return [
    {
      headerName: 'S/N',
      field: 'serial',
      width: 68,
      maxWidth: 68,
      sortable: false,
      filter: false,
    },
    {
      headerName: 'When',
      field: 'createdAt',
      width: 180,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
    },
    {
      headerName: 'Movement',
      field: 'counterparty',
      flex: 2,
      minWidth: 220,
      cellRenderer: (p: ICellRendererParams<SerialEntry>) => {
        if (!p.data) return null;
        return (
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-foreground">{p.data.counterparty}</span>
            {p.data.subtitle && (
              <span className="text-xs text-muted-foreground">{p.data.subtitle}</span>
            )}
          </div>
        );
      },
    },
    {
      headerName: 'Direction',
      field: 'direction',
      width: 130,
      cellRenderer: (p: ICellRendererParams<SerialEntry, string>) => {
        if (!p.data) return null;
        const income = p.data.direction === 'income';
        return (
          <span
            className={`inline-flex items-center gap-1 text-sm font-medium ${
              income ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
            }`}
          >
            {income ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {income ? 'Income' : 'Expense'}
            {p.data.isReversal && <span className="text-[10px] text-amber-600">·rev</span>}
          </span>
        );
      },
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 160,
      cellRenderer: (p: ICellRendererParams<SerialEntry>) => {
        if (!p.data) return null;
        const income = p.data.direction === 'income';
        return (
          <span
            className={`text-sm font-medium tabular-nums ${
              income ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
            }`}
          >
            {income ? '+' : '−'}
            {new Intl.NumberFormat().format(p.data.amount)} {p.data.currency}
          </span>
        );
      },
    },
    {
      headerName: 'Via',
      field: 'sourceLabel',
      width: 100,
      cellRenderer: (p: ICellRendererParams<SerialEntry, string>) => {
        if (!p.data || !p.value) return null;
        return (
          <Badge
            variant="outline"
            className={
              p.value === 'Auto'
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                : 'border-border text-foreground'
            }
          >
            {p.value}
          </Badge>
        );
      },
    },
    {
      headerName: 'Memo',
      field: 'memo',
      flex: 1,
      minWidth: 160,
      cellRenderer: (p: ICellRendererParams<SerialEntry, string>) =>
        p.value ? (
          <span className="text-xs text-muted-foreground">{p.value}</span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        ),
    },
  ];
}
