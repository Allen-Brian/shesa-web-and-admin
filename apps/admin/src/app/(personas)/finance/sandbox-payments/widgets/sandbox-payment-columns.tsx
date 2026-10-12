import { Badge, Private, type ColDef, type ICellRendererParams } from '@shesa/ui';

import type { SerialSandboxPaymentRow } from './sandbox-payment-types';

const STATUS_STYLES: Record<string, string> = {
  SUCCESSFUL: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  FAILED: 'border-destructive/40 bg-destructive/10 text-destructive',
  CANCELLED: 'border-border bg-muted/40 text-muted-foreground',
  CANCELLED_BY_PAYER: 'border-border bg-muted/40 text-muted-foreground',
  PENDING: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  PAYMENT_IN_PROGRESS: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

function money(value: number | null, currency: string | null): string {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(value)} ${
    currency ?? ''
  }`.trim();
}

/**
 * Columns for the sandbox payments table.
 *
 * Ordered around the question a tester actually has: did the gateway
 * agree with us, and what did it keep? Gross, fee and net sit next to
 * each other for that reason, and the reconciliation column states the
 * answer rather than leaving it to be worked out from the numbers.
 */
export function buildSandboxPaymentColumns(): ColDef<SerialSandboxPaymentRow>[] {
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
      // Separate columns so each sorts on its own — "everything on the
      // 14th" and "everything after 18:00" are different questions.
      headerName: 'Date',
      field: 'createdAt',
      width: 130,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
    },
    {
      headerName: 'Time',
      field: 'createdAt',
      colId: 'createdAtTime',
      width: 100,
      valueFormatter: (p) =>
        p.value
          ? new Date(p.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—',
      cellClass: 'tabular-nums text-muted-foreground',
    },
    {
      headerName: 'Charge',
      field: 'chargeName',
      flex: 1.4,
      minWidth: 170,
      cellRenderer: (p: ICellRendererParams<SerialSandboxPaymentRow, string>) =>
        p.data ? (
          <div className="flex flex-col leading-tight">
            <span className="text-foreground">{p.data.chargeName}</span>
            <span className="text-xs text-muted-foreground">{p.data.scopeName}</span>
          </div>
        ) : null,
    },
    {
      headerName: 'Payer',
      field: 'payerLabel',
      flex: 1.5,
      minWidth: 220,
      cellRenderer: (p: ICellRendererParams<SerialSandboxPaymentRow, string>) =>
        p.data ? (
          <div className="flex min-w-0 flex-col leading-tight">
            <Private>
              <span className="block truncate text-foreground" title={p.data.payerLabel}>
                {p.data.payerLabel}
              </span>
            </Private>
            <Private>
              <span className="block truncate text-xs text-muted-foreground">
                {p.data.payerPhone ?? p.data.payerEmail ?? '—'}
              </span>
            </Private>
          </div>
        ) : null,
    },
    {
      headerName: 'Gateway status',
      field: 'providerStatus',
      width: 180,
      cellRenderer: (p: ICellRendererParams<SerialSandboxPaymentRow, string>) => {
        const status = p.value ?? 'UNKNOWN';
        return (
          <Badge
            variant="outline"
            className={`h-5 ${STATUS_STYLES[status] ?? 'border-border text-foreground'}`}
          >
            {status.replaceAll('_', ' ').toLowerCase()}
          </Badge>
        );
      },
    },
    {
      headerName: 'Asked for',
      field: 'amount',
      width: 130,
      type: 'rightAligned',
      valueFormatter: (p) => money(p.value as number, p.data?.currency ?? null),
    },
    {
      headerName: 'Gateway gross',
      field: 'gatewayAmount',
      width: 140,
      type: 'rightAligned',
      valueFormatter: (p) => money(p.value as number | null, p.data?.gatewayCurrency ?? null),
    },
    {
      headerName: 'Fee',
      field: 'gatewayFee',
      width: 110,
      type: 'rightAligned',
      valueFormatter: (p) => money(p.value as number | null, p.data?.gatewayCurrency ?? null),
    },
    {
      headerName: 'Net received',
      field: 'gatewayNetAmount',
      width: 140,
      type: 'rightAligned',
      valueFormatter: (p) => money(p.value as number | null, p.data?.gatewayCurrency ?? null),
    },
    {
      headerName: 'Reconciles',
      field: 'reconciles',
      width: 130,
      cellRenderer: (p: ICellRendererParams<SerialSandboxPaymentRow, boolean>) => {
        // Only meaningful once the gateway has reported an amount.
        if (!p.data || p.data.gatewayAmount == null) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return p.value ? (
          <Badge
            variant="outline"
            className="h-5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          >
            matches
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="h-5 border-destructive/40 bg-destructive/10 text-destructive"
          >
            mismatch
          </Badge>
        );
      },
    },
    {
      headerName: 'Gateway reference',
      field: 'providerRef',
      flex: 1,
      minWidth: 190,
      cellRenderer: (p: ICellRendererParams<SerialSandboxPaymentRow, string>) =>
        p.data ? (
          <div className="flex flex-col leading-tight font-mono text-xs">
            <span className="text-foreground">{p.data.providerRef ?? '—'}</span>
            <span className="text-muted-foreground">{p.data.providerTransactionId ?? '—'}</span>
          </div>
        ) : null,
    },
  ];
}
