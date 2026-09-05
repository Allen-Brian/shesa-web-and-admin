import { Archive, CalendarPlus, CircleCheck, Square } from 'lucide-react';

import { Button, type ColDef, type ICellRendererParams } from '@shesa/ui';

import { CampaignNameCell } from './campaign-name-cell';
import type { CampaignRow, SerialCampaignRow } from './donations-types';
import { LifecycleBadge } from '@/components/finance/lifecycle-badge';

interface CampaignColumnActions {
  readonly onApprove: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onExtend: (row: CampaignRow) => void;
  readonly onArchive: (id: string) => void;
  readonly pending: boolean;
}

/**
 * Column defs for the campaigns DataTable. Actions column shows only
 * the transitions valid for the current lifecycle so operators can't
 * fat-finger an illegal move (approve on an open campaign, close on a
 * draft, etc.). Icons only — the header row on top of the table
 * carries the affordance label for accessibility.
 */
export function buildCampaignColumns(actions: CampaignColumnActions): ColDef<SerialCampaignRow>[] {
  const { onApprove, onClose, onExtend, onArchive, pending } = actions;
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
      headerName: 'Campaign',
      field: 'name',
      flex: 2,
      minWidth: 220,
      cellRenderer: (p: ICellRendererParams<SerialCampaignRow, string>) =>
        p.data ? <CampaignNameCell row={p.data} /> : null,
    },
    {
      headerName: 'Raised',
      field: 'raised',
      flex: 1,
      minWidth: 160,
      cellRenderer: (p: ICellRendererParams<SerialCampaignRow, number>) =>
        p.data ? (
          <span className="text-sm text-foreground">
            {new Intl.NumberFormat().format(Math.round(p.data.raised))} {p.data.currency}
          </span>
        ) : null,
    },
    {
      headerName: 'Donations',
      field: 'donationCount',
      width: 120,
      valueFormatter: (p) => (p.value != null ? String(p.value) : '0'),
    },
    {
      headerName: 'Closes',
      field: 'closeDate',
      width: 140,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
    },
    {
      headerName: 'Lifecycle',
      field: 'lifecycle',
      width: 130,
      cellRenderer: (p: ICellRendererParams<SerialCampaignRow, string>) => (
        <LifecycleBadge value={p.value ?? null} />
      ),
    },
    {
      headerName: 'Actions',
      colId: 'row_actions',
      width: 250,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<SerialCampaignRow>) => {
        if (!p.data) return null;
        const row = p.data;
        return (
          <div className="flex items-center gap-1">
            {row.lifecycle === 'draft' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(row.id);
                }}
                loading={pending}
                disabled={pending}
                title="Approve → open"
              >
                <CircleCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {row.lifecycle === 'open' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(row.id);
                }}
                loading={pending}
                disabled={pending}
                title="Close"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            )}
            {(row.lifecycle === 'open' || row.lifecycle === 'closed') && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onExtend(row);
                }}
                loading={pending}
                disabled={pending}
                title="Extend"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
              </Button>
            )}
            {row.lifecycle !== 'archived' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(row.id);
                }}
                loading={pending}
                disabled={pending}
                title="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
