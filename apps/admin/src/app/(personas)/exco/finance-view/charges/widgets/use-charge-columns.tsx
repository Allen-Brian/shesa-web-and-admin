'use client';

import { useMemo } from 'react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { ChargeAmountCell } from './amount-cell';
import { formatRecurrence } from '@/lib/format/recurrence';
import { ChargeNameCell } from './name-cell';
import { ChargeStatusBadge } from './charge-status-badge';
import type { SerialRow } from './exco-charge-widget-types';

/**
 * Column defs for the branch read-only charges table. Extracted so
 * the container view stays under the SRP line-count target.
 */
export function useChargeColumns(): ColDef<SerialRow>[] {
  return useMemo<ColDef<SerialRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 68,
        maxWidth: 68,
        sortable: false,
        filter: false,
        suppressMovable: true,
      },
      {
        headerName: 'Name',
        field: 'name',
        flex: 3,
        minWidth: 220,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) =>
          p.data ? <ChargeNameCell row={p.data} /> : null,
      },
      {
        headerName: 'Scope',
        field: 'scopeName',
        flex: 1.4,
        minWidth: 140,
        cellClass: 'text-sm text-muted-foreground',
      },
      {
        headerName: 'Amount',
        field: 'baseAmount',
        width: 140,
        cellRenderer: (p: ICellRendererParams<SerialRow>) =>
          p.data ? <ChargeAmountCell row={p.data} /> : null,
      },
      {
        headerName: 'Recurrence',
        field: 'recurrence',
        width: 140,
        cellClass: 'text-sm text-foreground',
        valueFormatter: (p) =>
          p.data ? formatRecurrence(p.data.recurrence, p.data.recurrenceInterval) : '',
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 110,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <ChargeStatusBadge status={p.value ?? ''} />
        ),
      },
    ],
    [],
  );
}
