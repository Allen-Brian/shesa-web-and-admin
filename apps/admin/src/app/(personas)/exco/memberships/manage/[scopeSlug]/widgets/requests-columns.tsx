import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { RequestRowActionsMenu } from './request-row-actions-menu';
import type { RequestRow } from './switcher';

type SerialRow = RequestRow & { readonly serial: number };

interface BuildRequestColumnsArgs {
  readonly pending: boolean;
  readonly onApprove: (row: SerialRow) => void;
  readonly onReject: (row: SerialRow) => void;
}

export function buildRequestColumns({
  pending,
  onApprove,
  onReject,
}: BuildRequestColumnsArgs): ColDef<SerialRow>[] {
  return [
    {
      headerName: 'S/N',
      field: 'serial',
      width: 72,
      maxWidth: 72,
      sortable: false,
      filter: false,
      suppressMovable: true,
    },
    { headerName: 'Name', field: 'full_name', flex: 2, minWidth: 200 },
    {
      headerName: 'Batch',
      field: 'batch_name',
      width: 140,
      valueFormatter: (p) => p.value ?? '—',
    },
    {
      headerName: 'Email',
      field: 'email',
      flex: 1.5,
      minWidth: 180,
      valueFormatter: (p) => p.value ?? '—',
    },
    { headerName: 'Phone', field: 'phone', width: 140, valueFormatter: (p) => p.value ?? '—' },
    {
      headerName: 'Method',
      field: 'join_method',
      width: 130,
      cellClass: 'text-xs',
    },
    {
      headerName: 'Requested At',
      field: 'requested_at',
      width: 150,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
    },
    {
      headerName: '',
      colId: 'row_actions',
      width: 64,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? (
          <RequestRowActionsMenu
            disabled={pending}
            onApprove={() => onApprove(p.data as SerialRow)}
            onReject={() => onReject(p.data as SerialRow)}
          />
        ) : null,
    },
  ];
}
