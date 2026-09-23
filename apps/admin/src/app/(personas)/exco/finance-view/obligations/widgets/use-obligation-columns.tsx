'use client';

import { useMemo } from 'react';
import { Building2, CreditCard } from 'lucide-react';

import { Button, type ColDef, type ICellRendererParams } from '@shesa/ui';

import { ObligationStatusBadge } from './obligation-status-badge';
import { ProgressCell } from './progress-cell';
import { formatRecurrence } from '@/lib/format/recurrence';
import type { ObligationRow, SerialRow } from './obligation-widget-types';

interface UseObligationColumnsArgs {
  readonly onOpenPayment: (row: ObligationRow) => void;
}

/**
 * Column definitions for the obligations DataTable. Extracted so the
 * container view stays under the 150-line ceiling.
 */
export function useObligationColumns({
  onOpenPayment,
}: UseObligationColumnsArgs): ColDef<SerialRow>[] {
  return useMemo<ColDef<SerialRow>[]>(
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
        headerName: 'Obligation',
        field: 'chargeName',
        flex: 2.4,
        minWidth: 240,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          return (
            <div className="flex h-full items-center gap-2.5 py-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">
                  {p.data.chargeName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  by {p.data.imposerName}
                  {p.data.recurrence && ` · ${formatRecurrence(p.data.recurrence)}`}
                </span>
              </div>
            </div>
          );
        },
      },
      { headerName: 'On branch', field: 'branchName', width: 150 },
      {
        headerName: 'Period',
        field: 'periodStart',
        width: 170,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const { periodStart: start, periodEnd: end } = p.data;
          if (!start) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs text-muted-foreground">
              {new Date(start).toLocaleDateString()}
              {end && ` → ${new Date(end).toLocaleDateString()}`}
            </span>
          );
        },
      },
      {
        headerName: 'Progress',
        colId: 'progress',
        flex: 1.6,
        minWidth: 200,
        valueGetter: (p) => {
          const r = p.data as SerialRow | undefined;
          if (!r) return 0;
          return r.amount > 0 ? r.paid / r.amount : 0;
        },
        cellRenderer: (p: ICellRendererParams<SerialRow>) =>
          p.data ? <ProgressCell row={p.data} /> : null,
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 110,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <ObligationStatusBadge status={p.value ?? ''} />
        ),
      },
      {
        headerName: 'Actions',
        colId: 'row_pay',
        width: 130,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const canRecord = p.data.status !== 'paid' && p.data.status !== 'cancelled';
          return (
            <Button
              type="button"
              variant={canRecord ? 'default' : 'outline'}
              size="sm"
              className="h-7 gap-1.5"
              disabled={!canRecord}
              onClick={(e) => {
                e.stopPropagation();
                onOpenPayment(p.data!);
              }}
            >
              <CreditCard className="h-3.5 w-3.5" />
              {p.data.status === 'partial' ? 'Add pay' : 'Record'}
            </Button>
          );
        },
      },
    ],
    [onOpenPayment],
  );
}
