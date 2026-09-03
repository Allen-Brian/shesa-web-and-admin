'use client';

import { useMemo } from 'react';
import { RefreshCcw } from 'lucide-react';

import { Button, type ColDef, type ICellRendererParams } from '@shesa/ui';

import { InviteStatusBadge } from './invite-status-badge';
import type { ClaimStatus, SerialRow } from './invite-widget-types';

interface UseInviteColumnsArgs {
  readonly pending: boolean;
  readonly onResend: (memberId: string, fullName: string) => void;
}

/**
 * Column definitions for the invites DataTable. Extracted so the main
 * view stays under the 150-line ceiling.
 */
export function useInviteColumns({ pending, onResend }: UseInviteColumnsArgs): ColDef<SerialRow>[] {
  return useMemo<ColDef<SerialRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 72,
        maxWidth: 72,
        sortable: false,
        filter: false,
        suppressMovable: true,
      },
      {
        headerName: 'Code',
        field: 'memberCode',
        width: 150,
        cellClass: 'text-xs',
        valueFormatter: (p) => p.value ?? '—',
      },
      { headerName: 'Name', field: 'fullName', flex: 2, minWidth: 200 },
      {
        headerName: 'Batch',
        field: 'batchName',
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
      {
        headerName: 'Status',
        field: 'claimStatus',
        width: 130,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <InviteStatusBadge
            status={(p.value as ClaimStatus) ?? null}
            error={p.data?.inviteError ?? null}
          />
        ),
      },
      {
        headerName: 'Last sent',
        field: 'lastSentAt',
        width: 140,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
      {
        headerName: 'Resent',
        field: 'resentCount',
        width: 90,
        valueFormatter: (p) => (p.value != null ? String(p.value) : '0'),
      },
      {
        headerName: 'Action',
        colId: 'row_actions',
        width: 130,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const isClaimed = p.data.claimStatus === 'claimed';
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || isClaimed || !p.data.email}
              onClick={(e) => {
                e.stopPropagation();
                onResend(p.data!.memberId, p.data!.fullName);
              }}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {isClaimed ? 'Claimed' : 'Resend'}
            </Button>
          );
        },
      },
    ],
    [pending, onResend],
  );
}
