'use client';

import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Printer, Receipt as ReceiptIcon } from 'lucide-react';

import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EntityTablePanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

export interface ReceiptRow {
  readonly token: string;
  readonly receiptNumber: string;
  readonly paymentId: string;
  readonly chargeName: string;
  readonly chargeShape: string | null;
  readonly scopeName: string;
  readonly payerLabel: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly isReversal: boolean;
  readonly isReversed: boolean;
  readonly createdAt: string;
}

type SerialRow = ReceiptRow & { readonly serial: number };

interface ReceiptsViewProps {
  readonly receipts: readonly ReceiptRow[];
  readonly baseUrl: string;
}

export function ReceiptsView({ receipts, baseUrl }: ReceiptsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'cleared' | 'reversal' | 'reversed'>(
    'all',
  );
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [previewing, setPreviewing] = useState<ReceiptRow | null>(null);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return receipts
      .filter((r) => {
        if (statusFilter === 'cleared' && (r.isReversal || r.isReversed)) return false;
        if (statusFilter === 'reversal' && !r.isReversal) return false;
        if (statusFilter === 'reversed' && !r.isReversed) return false;
        if (!q) return true;
        if (r.receiptNumber.toLowerCase().includes(q)) return true;
        if (r.payerLabel.toLowerCase().includes(q)) return true;
        if (r.chargeName.toLowerCase().includes(q)) return true;
        if (r.scopeName.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [receipts, search, statusFilter]);

  const buildVerifyUrl = (token: string) => `${baseUrl}/verify?token=${encodeURIComponent(token)}`;

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Verify URL copied.');
    } catch {
      toast.error('Could not copy — copy manually from the dialog.');
    }
  };

  const columnDefs = useMemo<ColDef<SerialRow>[]>(
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
        headerName: 'Receipt #',
        field: 'receiptNumber',
        width: 170,
        cellClass: 'font-mono text-xs',
      },
      {
        headerName: 'When',
        field: 'createdAt',
        width: 170,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
      },
      {
        headerName: 'Payer',
        field: 'payerLabel',
        flex: 1.5,
        minWidth: 180,
      },
      {
        headerName: 'For',
        field: 'chargeName',
        flex: 1.5,
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
          p.data ? (
            <div className="flex flex-col leading-tight">
              <span className="text-foreground">{p.data.chargeName}</span>
              <span className="text-xs text-muted-foreground">
                {p.data.scopeName}
                {p.data.chargeShape && ` · ${p.data.chargeShape}`}
              </span>
            </div>
          ) : null,
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 150,
        cellRenderer: (p: ICellRendererParams<SerialRow, number>) =>
          p.data ? (
            <span
              className={`font-mono text-sm ${
                p.data.isReversal ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
              }`}
            >
              {new Intl.NumberFormat().format(p.data.amount)} {p.data.currency}
            </span>
          ) : null,
      },
      {
        headerName: 'Status',
        field: 'isReversal',
        width: 130,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          if (p.data.isReversal) {
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
        width: 160,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const row = p.data;
          return (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewing(row);
                }}
                title="View & print"
              >
                <Printer className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  copyUrl(buildVerifyUrl(row.token));
                }}
                title="Copy verify URL"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [baseUrl],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ReceiptIcon className="h-6 w-6" />
          Receipts
        </h1>
        <p className="text-sm text-muted-foreground">
          Every payment auto-generates a receipt. The verify URL is public and returns a
          minimal-disclosure payload — safe to print or share.
        </p>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'receipt' : 'receipts'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
        filters={
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All receipts</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="reversal">Reversals</SelectItem>
              <SelectItem value="reversed">Reversed originals</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.token}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-lg print:max-w-full print:border-0 print:shadow-none">
          <DialogHeader>
            <DialogTitle className="print:hidden">Receipt preview</DialogTitle>
            <DialogDescription className="print:hidden">
              A printable render of an immutable payment. The QR code / verify URL points back to
              the authoritative record — tampering the paper fails verification.
            </DialogDescription>
          </DialogHeader>
          {previewing && (
            <div className="flex flex-col gap-4" id="receipt-print">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Receipt
                    </div>
                    <div className="font-mono text-lg font-semibold text-foreground">
                      {previewing.receiptNumber}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Date
                    </div>
                    <div className="text-sm text-foreground">
                      {new Date(previewing.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-y border-border py-3">
                  <ReceiptRow2 k="Amount">
                    <span
                      className={`font-mono text-lg font-semibold ${
                        previewing.isReversal
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-foreground'
                      }`}
                    >
                      {new Intl.NumberFormat().format(previewing.amount)} {previewing.currency}
                    </span>
                  </ReceiptRow2>
                  <ReceiptRow2 k="For">{previewing.chargeName}</ReceiptRow2>
                  <ReceiptRow2 k="At">{previewing.scopeName}</ReceiptRow2>
                  <ReceiptRow2 k="Payer">{previewing.payerLabel}</ReceiptRow2>
                  <ReceiptRow2 k="Method">{formatMethod(previewing.method)}</ReceiptRow2>
                  {previewing.isReversal && (
                    <ReceiptRow2 k="Note">
                      <span className="text-amber-700 dark:text-amber-400">
                        This is a reversal receipt.
                      </span>
                    </ReceiptRow2>
                  )}
                  {previewing.isReversed && (
                    <ReceiptRow2 k="Note">
                      <span className="text-destructive">
                        This payment has been reversed downstream.
                      </span>
                    </ReceiptRow2>
                  )}
                </div>

                <div className="mt-4 flex flex-col items-center gap-2">
                  <img
                    alt="Verification QR"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(buildVerifyUrl(previewing.token))}`}
                    className="h-32 w-32 rounded border border-border bg-white p-1"
                  />
                  <div className="text-center text-xs text-muted-foreground">
                    Scan or visit to verify authenticity
                  </div>
                  <div className="break-all text-center font-mono text-[10px] text-muted-foreground">
                    {buildVerifyUrl(previewing.token)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-2 print:hidden">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyUrl(buildVerifyUrl(previewing.token))}
                >
                  <Copy className="h-4 w-4" />
                  Copy URL
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(buildVerifyUrl(previewing.token), '_blank', 'noopener')
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open verify
                  </Button>
                  <Button type="button" size="sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button type="button" size="sm" variant="outline" onClick={() => setPreviewing(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptRow2({ k, children }: { readonly k: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}

function formatMethod(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'mtn_momo':
      return 'MTN MoMo';
    case 'orange_money':
      return 'Orange Money';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'card':
      return 'Card';
    default:
      return method;
  }
}
