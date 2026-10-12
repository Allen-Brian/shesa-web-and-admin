import { Undo2 } from 'lucide-react';

import { Badge, Button, Private, type ColDef, type ICellRendererParams } from '@shesa/ui';

import { DonationCampaignCell } from './donation-campaign-cell';
import { formatMethod } from './donations-helpers';
import type { DonationRow, SerialDonationRow } from './donations-types';

interface DonationColumnActions {
  readonly onReverse: (row: DonationRow) => void;
  readonly pending: boolean;
}

/**
 * Column defs for the donations DataTable. Status column collapses
 * three orthogonal signals — is-reversal, is-reversed, cleared — into
 * a single coloured pill so the eye picks up the outlier quickly.
 * Reverse action is hidden on reversal + reversed rows: reversals
 * can't themselves be reversed, and reversed rows are already dead.
 */
export function buildDonationColumns(actions: DonationColumnActions): ColDef<SerialDonationRow>[] {
  const { onReverse, pending } = actions;
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
    {
      headerName: 'When',
      field: 'createdAt',
      width: 170,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
    },
    {
      headerName: 'Donor',
      field: 'donorLabel',
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<SerialDonationRow, string>) => {
        if (!p.data) return null;
        const row = p.data;
        return (
          <div className="flex min-w-0 flex-col leading-tight">
            <Private>
              <span className="block truncate text-foreground" title={row.donorLabel}>
                {row.donorLabel}
              </span>
            </Private>
            <span className="truncate text-xs text-muted-foreground">
              {row.isMember ? 'Member' : row.isPublic ? 'Public site' : 'Walk-in'}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Campaign',
      field: 'campaignName',
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<SerialDonationRow>) =>
        p.data ? <DonationCampaignCell row={p.data} /> : null,
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialDonationRow, number>) =>
        p.data ? (
          <span
            className={`text-sm ${
              p.data.reversesPaymentId ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
            }`}
          >
            {new Intl.NumberFormat().format(p.data.amount)} {p.data.currency}
          </span>
        ) : null,
    },
    {
      headerName: 'Method',
      field: 'method',
      width: 130,
      valueFormatter: (p) => formatMethod(p.value ?? ''),
    },
    {
      headerName: 'Status',
      field: 'reversesPaymentId',
      width: 140,
      cellRenderer: (p: ICellRendererParams<SerialDonationRow>) => {
        if (!p.data) return null;
        if (p.data.reversesPaymentId) {
          return (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              Reversal
            </Badge>
          );
        }
        if (p.data.isReversed) {
          return (
            <Badge
              variant="outline"
              className="border-destructive/40 bg-destructive/10 text-destructive"
            >
              Reversed
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          >
            Cleared
          </Badge>
        );
      },
    },
    {
      headerName: 'Actions',
      colId: 'row_actions',
      width: 130,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<SerialDonationRow>) => {
        if (!p.data) return null;
        const row = p.data;
        if (row.reversesPaymentId || row.isReversed) return null;
        return (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onReverse(row);
            }}
            loading={pending}
            disabled={pending}
            title="Reverse donation"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Reverse
          </Button>
        );
      },
    },
  ];
}
