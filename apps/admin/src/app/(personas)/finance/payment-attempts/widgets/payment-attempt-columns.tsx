import { Badge, Private, type ColDef, type ICellRendererParams } from '@shesa/ui';

import type { SerialPaymentAttemptRow } from './payment-attempt-types';

/**
 * Colours follow what an operator should do about the row, not the
 * severity of the word. `initiated` is amber because it means our side
 * failed and somebody should look; `pending` is neutral because a payer
 * taking their time is not a problem.
 */
const STATUS_STYLES: Record<string, string> = {
  initiated: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  pending: 'border-border bg-muted/40 text-foreground',
  succeeded: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  failed: 'border-destructive/40 bg-destructive/10 text-destructive',
  cancelled: 'border-border bg-muted/40 text-muted-foreground',
  expired: 'border-border bg-muted/40 text-muted-foreground',
};

const METHOD_LABELS: Record<string, string> = {
  mtn_momo: 'MTN MoMo',
  orange_money: 'Orange Money',
  card: 'Card',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
};

export function buildPaymentAttemptColumns(): ColDef<SerialPaymentAttemptRow>[] {
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
      headerName: 'Status',
      field: 'status',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialPaymentAttemptRow, string>) => {
        const status = p.value ?? 'unknown';
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={`h-5 capitalize ${STATUS_STYLES[status] ?? 'border-border text-foreground'}`}
            >
              {status}
            </Badge>
            {p.data?.mode === 'sandbox' && (
              <Badge variant="outline" className="h-5 border-amber-500/40 text-[10px] uppercase">
                test
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      headerName: 'For',
      field: 'chargeName',
      flex: 1.3,
      minWidth: 170,
      cellRenderer: (p: ICellRendererParams<SerialPaymentAttemptRow, string>) =>
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
      cellRenderer: (p: ICellRendererParams<SerialPaymentAttemptRow, string>) =>
        p.data ? (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <Private className="min-w-0 flex-1">
                <span className="block truncate text-foreground" title={p.data.payerLabel}>
                  {p.data.payerLabel}
                </span>
              </Private>
              {p.data.isMember && (
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary">
                  member
                </span>
              )}
            </span>
            <Private>
              <span className="block truncate text-xs text-muted-foreground">
                {p.data.payerPhone ?? p.data.payerEmail ?? '—'}
              </span>
            </Private>
          </div>
        ) : null,
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 140,
      type: 'rightAligned',
      valueFormatter: (p) =>
        p.value == null
          ? '—'
          : `${new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(
              p.value as number,
            )} ${p.data?.currency ?? ''}`.trim(),
    },
    {
      headerName: 'Method',
      field: 'method',
      width: 140,
      // Null until the gateway reports it. An em dash is the honest
      // rendering of "the payer has not chosen yet".
      valueFormatter: (p) =>
        p.value ? (METHOD_LABELS[p.value as string] ?? (p.value as string)) : '—',
    },
    {
      headerName: 'Gateway reference',
      field: 'gatewayRef',
      flex: 1,
      minWidth: 190,
      cellRenderer: (p: ICellRendererParams<SerialPaymentAttemptRow, string>) =>
        p.data ? (
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-xs text-foreground">{p.data.gatewayRef ?? '—'}</span>
            {p.data.failureReason && (
              <span className="truncate text-xs text-destructive" title={p.data.failureReason}>
                {p.data.failureReason}
              </span>
            )}
          </div>
        ) : null,
    },
  ];
}
