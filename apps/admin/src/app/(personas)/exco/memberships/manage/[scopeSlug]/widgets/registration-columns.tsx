import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { RegistrationIcon } from '@/components/memberships/registration-icon';

import { MembershipBadge } from './membership-badge';
import { RegistrationRowActionsMenu } from './registration-row-actions-menu';
import type { RegistrationConfirmState, SerialRegistrationRow } from './registration-row-types';

interface BuildRegistrationColumnsArgs {
  readonly setConfirm: (c: RegistrationConfirmState) => void;
}

export function buildRegistrationColumns({
  setConfirm,
}: BuildRegistrationColumnsArgs): ColDef<SerialRegistrationRow>[] {
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
      width: 120,
      valueFormatter: (p) => p.value ?? '—',
    },
    {
      headerName: 'Fee',
      field: 'amount',
      width: 130,
      valueFormatter: (p) => {
        const d = p.data;
        if (!d?.fee_required) return '—';
        if (d.amount == null) return d.currency_code ?? '—';
        return `${d.amount} ${d.currency_code ?? ''}`.trim();
      },
    },
    {
      headerName: 'State',
      field: 'registration_state',
      width: 170,
      cellRenderer: (p: ICellRendererParams<SerialRegistrationRow, string>) => (
        <RegistrationIcon state={p.value ?? null} />
      ),
    },
    {
      headerName: 'Notes',
      colId: 'notes',
      flex: 1.5,
      minWidth: 200,
      valueGetter: (p) => p.data?.waived_reason ?? p.data?.paid_on_behalf_note ?? null,
      valueFormatter: (p) => p.value ?? '—',
    },
    {
      headerName: 'Membership',
      field: 'membership_status',
      width: 120,
      cellRenderer: (p: ICellRendererParams<SerialRegistrationRow, string | null>) => (
        <MembershipBadge status={p.value ?? null} />
      ),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 96,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (params: ICellRendererParams<SerialRegistrationRow>) =>
        params.data ? (
          <RegistrationRowActionsMenu row={params.data} setConfirm={setConfirm} />
        ) : null,
    },
  ];
}
