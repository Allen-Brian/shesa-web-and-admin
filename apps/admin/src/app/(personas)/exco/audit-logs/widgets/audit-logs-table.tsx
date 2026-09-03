'use client';

import { useMemo } from 'react';

import {
  DataTable,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type RowClickedEvent,
} from '@shesa/ui';

import { ActionCell } from './action-cell';
import { ActorCell } from './actor-cell';
import { DayCell } from './day-cell';
import { EntityCell } from './entity-cell';
import { TimeCell } from './time-cell';
import type { SerialRow } from './audit-log-widget-types';

export function AuditLogsTable({
  rows,
  onRowClick,
  onGridReady,
}: {
  readonly rows: readonly SerialRow[];
  readonly onRowClick: (row: SerialRow) => void;
  readonly onGridReady: (api: GridApi<SerialRow>) => void;
}) {
  const columnDefs = useMemo<ColDef<SerialRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 64,
        maxWidth: 64,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Actor',
        field: 'actor_label',
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<SerialRow>) =>
          p.data ? <ActorCell label={p.data.actor_label} email={p.data.actor_email} /> : null,
      },
      {
        headerName: 'Time',
        colId: 'time',
        width: 100,
        valueGetter: (p) => p.data?.created_at ?? '',
        cellRenderer: (p: ICellRendererParams<SerialRow>) =>
          p.data ? <TimeCell iso={p.data.created_at} /> : null,
      },
      {
        headerName: 'Day',
        colId: 'day',
        width: 140,
        valueGetter: (p) => p.data?.created_at ?? '',
        cellRenderer: (p: ICellRendererParams<SerialRow>) =>
          p.data ? <DayCell iso={p.data.created_at} /> : null,
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
        cellRenderer: (p: ICellRendererParams<SerialRow>) =>
          p.data ? (
            <EntityCell
              schema={p.data.entity_schema}
              table={p.data.entity_table}
              entityId={p.data.entity_id}
            />
          ) : null,
      },
    ],
    [],
  );

  return (
    <DataTable<SerialRow>
      rowData={rows as SerialRow[]}
      columnDefs={columnDefs}
      getRowId={(p) => p.data.id}
      onGridReady={(e) => onGridReady(e.api)}
      onRowClicked={(e: RowClickedEvent<SerialRow>) => e.data && onRowClick(e.data)}
      showColumnPicker={false}
      selectable={false}
    />
  );
}
