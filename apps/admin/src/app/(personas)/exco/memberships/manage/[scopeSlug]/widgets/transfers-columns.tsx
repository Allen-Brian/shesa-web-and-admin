import type { ColDef, ICellRendererParams } from '@shesa/ui';

import type { TransferRow } from './switcher';
import { TransferRowActionsMenu } from './transfer-row-actions-menu';

type SerialRow = TransferRow & { readonly serial: number };

interface BuildTransferColumnsArgs {
  readonly pending: boolean;
  readonly onApprove: (row: SerialRow) => void;
  readonly onDeny: (row: SerialRow) => void;
}

export function buildTransferColumns({
  pending,
  onApprove,
  onDeny,
}: BuildTransferColumnsArgs): ColDef<SerialRow>[] {
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
      flex: 1.5,
      minWidth: 180,
      valueFormatter: (p) => p.value ?? '—',
    },
    {
      headerName: 'From',
      field: 'source_scope_name',
      flex: 1.5,
      minWidth: 180,
      valueFormatter: (p) => p.value ?? '—',
    },
    {
      headerName: 'Email',
      field: 'email',
      flex: 1.5,
      minWidth: 180,
      valueFormatter: (p) => p.value ?? '—',
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
          <TransferRowActionsMenu
            disabled={pending}
            onApprove={() => onApprove(p.data as SerialRow)}
            onDeny={() => onDeny(p.data as SerialRow)}
          />
        ) : null,
    },
  ];
}
