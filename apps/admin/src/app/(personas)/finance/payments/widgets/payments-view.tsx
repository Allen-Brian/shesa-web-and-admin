'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  CircleDollarSign,
  Copy,
  ExternalLink,
  LandPlot,
  MoreHorizontal,
  Printer,
  Receipt as ReceiptIcon,
  Target,
  Undo2,
} from 'lucide-react';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EntityTablePanel,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatsCard,
  Textarea,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

import { recordManualPayment, reversePayment, type PaymentMethod } from '../actions';

export interface PaymentRow {
  readonly id: string;
  readonly obligationId: string | null;
  readonly chargeId: string | null;
  readonly chargeName: string;
  readonly chargeShape: string | null;
  readonly scopeName: string;
  readonly payerLabel: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reversesPaymentId: string | null;
  readonly externalRef: string | null;
  readonly createdAt: string;
  readonly receiptToken: string | null;
  readonly receiptNumber: string | null;
}

export interface ChargeOption {
  readonly id: string;
  readonly name: string;
  readonly shape: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly currency: string;
}

type SerialRow = PaymentRow & { readonly serial: number };

const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];

interface RecordForm {
  chargeId: string;
  amount: string;
  method: PaymentMethod;
  memo: string;
  externalRef: string;
}

const initialRecord = (chargeOptions: readonly ChargeOption[]): RecordForm => ({
  chargeId: chargeOptions[0]?.id ?? '',
  amount: '',
  method: 'cash',
  memo: '',
  externalRef: '',
});

interface PaymentsViewProps {
  readonly payments: readonly PaymentRow[];
  readonly chargeOptions: readonly ChargeOption[];
  readonly baseUrl: string;
}

export function PaymentsView({ payments, chargeOptions, baseUrl }: PaymentsViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'auto'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordForm>(() => initialRecord(chargeOptions));
  const [reversing, setReversing] = useState<PaymentRow | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [previewing, setPreviewing] = useState<PaymentRow | null>(null);

  const buildVerifyUrl = (token: string) => `${baseUrl}/verify?token=${encodeURIComponent(token)}`;

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Verify URL copied.');
    } catch {
      toast.error('Could not copy — copy manually from the receipt.');
    }
  };

  // Which payments have downstream reversals — used to show a chip on
  // the original row rather than in the reversal row.
  const reversedIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of payments) if (p.reversesPaymentId) set.add(p.reversesPaymentId);
    return set;
  }, [payments]);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return payments
      .filter((p) => {
        if (sourceFilter !== 'all' && p.source !== sourceFilter) return false;
        if (methodFilter !== 'all' && p.method !== methodFilter) return false;
        if (!q) return true;
        if (p.payerLabel.toLowerCase().includes(q)) return true;
        if (p.chargeName.toLowerCase().includes(q)) return true;
        if (p.scopeName.toLowerCase().includes(q)) return true;
        if (p.method.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((p, i) => ({ ...p, serial: i + 1 }));
  }, [payments, search, sourceFilter, methodFilter]);

  // KPI totals — computed from the full payments set (not the filtered
  // slice) so the strip stays stable while operators sift. Reversals
  // subtract from the collected total; the reversal count and rate
  // surface separately so operators can spot a spike in corrections.
  const kpis = useMemo(() => {
    const currencies = new Map<string, number>();
    let cleared = 0;
    let reversals = 0;
    for (const p of payments) {
      const signed = p.reversesPaymentId ? -p.amount : p.amount;
      currencies.set(p.currency, (currencies.get(p.currency) ?? 0) + signed);
      if (p.reversesPaymentId) reversals += 1;
      else cleared += 1;
    }
    const primaryCurrency = currencies.size === 1 ? currencies.keys().next().value : undefined;
    const totalCollected = primaryCurrency !== undefined ? currencies.get(primaryCurrency)! : null;
    const settledPayments = payments.filter((p) => !p.reversesPaymentId);
    const avg =
      settledPayments.length > 0
        ? settledPayments.reduce((a, b) => a + b.amount, 0) / settledPayments.length
        : 0;
    return {
      total: payments.length,
      cleared,
      reversals,
      reversalRate: payments.length > 0 ? Math.round((reversals / payments.length) * 100) : 0,
      totalCollected,
      primaryCurrency,
      avg,
    };
  }, [payments]);

  const canRecord = chargeOptions.length > 0;

  const resetRecord = () => setRecordForm(initialRecord(chargeOptions));

  const runRecord = () => {
    if (!recordForm.chargeId) {
      toast.error('Pick a charge.');
      return;
    }
    const amount = parseFloat(recordForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a positive amount.');
      return;
    }
    const charge = chargeOptions.find((c) => c.id === recordForm.chargeId);
    if (!charge) {
      toast.error('Invalid charge.');
      return;
    }

    startTransition(async () => {
      const result = await recordManualPayment({
        chargeId: charge.id,
        amount,
        currency: charge.currency,
        method: recordForm.method,
        memo: recordForm.memo.trim() || undefined,
        externalRef: recordForm.externalRef.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Payment recorded.');
      setRecordOpen(false);
      resetRecord();
      router.refresh();
    });
  };

  const runReverse = () => {
    if (!reversing) return;
    if (!reverseReason.trim()) {
      toast.error('Reason is required.');
      return;
    }
    const id = reversing.id;
    const reason = reverseReason.trim();
    setReversing(null);
    setReverseReason('');
    startTransition(async () => {
      const result = await reversePayment(id, reason);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Reversal recorded.');
      router.refresh();
    });
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
        headerName: 'When',
        field: 'createdAt',
        width: 170,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
      },
      {
        headerName: 'Payer',
        field: 'payerLabel',
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
          p.data ? (
            <div className="flex h-full items-center gap-2.5 py-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {getInitials(p.data.payerLabel)}
              </div>
              <span className="truncate text-sm font-medium text-foreground">
                {p.data.payerLabel}
              </span>
            </div>
          ) : null,
      },
      {
        headerName: 'For',
        field: 'chargeName',
        flex: 1.6,
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => {
          if (!p.data) return null;
          const ShapeIcon =
            p.data.chargeShape === 'goal'
              ? Target
              : p.data.chargeShape === 'fixed'
                ? CircleDollarSign
                : BadgeDollarSign;
          return (
            <div className="flex h-full items-center gap-2.5 py-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShapeIcon className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">
                  {p.data.chargeName}
                </span>
                {p.data.chargeShape && (
                  <span className="truncate text-xs text-muted-foreground">
                    {p.data.scopeName} · {p.data.chargeShape}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 150,
        cellRenderer: (p: ICellRendererParams<SerialRow, number>) => {
          if (!p.data) return null;
          const isReversal = !!p.data.reversesPaymentId;
          return (
            <span
              className={`inline-flex items-center gap-1 text-sm ${
                isReversal ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
              }`}
            >
              {isReversal ? (
                <ArrowDownRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5" />
              )}
              {new Intl.NumberFormat().format(p.data.amount)} {p.data.currency}
            </span>
          );
        },
      },
      {
        headerName: 'Method',
        field: 'method',
        width: 130,
        valueFormatter: (p) => formatMethod(p.value ?? ''),
      },
      {
        headerName: 'Source',
        field: 'source',
        width: 100,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <Badge
            variant="outline"
            className={
              p.value === 'auto'
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                : 'border-border text-foreground'
            }
          >
            {p.value === 'auto' ? 'Auto' : 'Manual'}
          </Badge>
        ),
      },
      {
        headerName: 'Status',
        field: 'reversesPaymentId',
        width: 140,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
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
          if (reversedIds.has(p.data.id)) {
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
        headerName: '',
        colId: 'row_actions',
        width: 64,
        maxWidth: 64,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const row = p.data;
          const isReversal = !!row.reversesPaymentId;
          const alreadyReversed = reversedIds.has(row.id);
          const canReverse = !isReversal && !alreadyReversed;
          const hasReceipt = !!row.receiptToken;
          if (!canReverse && !hasReceipt) return null;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                  disabled={pending}
                  title="Row actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {hasReceipt && (
                  <>
                    <DropdownMenuItem onSelect={() => setPreviewing(row)}>
                      <ReceiptIcon className="h-4 w-4" />
                      View / print receipt
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => row.receiptToken && copyUrl(buildVerifyUrl(row.receiptToken))}
                    >
                      <Copy className="h-4 w-4" />
                      Copy verify URL
                    </DropdownMenuItem>
                    {canReverse && <DropdownMenuSeparator />}
                  </>
                )}
                {canReverse && (
                  <DropdownMenuItem
                    onSelect={() => setReversing(row)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Undo2 className="h-4 w-4" />
                    Reverse payment
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [pending, reversedIds],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <LandPlot className="h-6 w-6" />
          Payments
        </h1>
        <p className="text-sm text-muted-foreground">
          Every payment across scopes you can see. Manual entries (cash / bank) and
          gateway-confirmed payments (auto) share this table. Reversals are new immutable rows —
          never edits.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Payments" value={kpis.total} />
        <StatsCard
          label="Net collected"
          value={
            kpis.primaryCurrency
              ? `${new Intl.NumberFormat().format(Math.round(kpis.totalCollected ?? 0))} ${kpis.primaryCurrency}`
              : '—'
          }
        />
        <StatsCard
          label="Avg. amount"
          value={
            kpis.primaryCurrency && kpis.cleared > 0
              ? `${new Intl.NumberFormat().format(Math.round(kpis.avg))} ${kpis.primaryCurrency}`
              : '—'
          }
        />
        <StatsCard label="Cleared" value={kpis.cleared} />
        <StatsCard label="Reversal rate" value={kpis.total > 0 ? `${kpis.reversalRate}%` : '—'} />
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'payment' : 'payments'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canRecord}
        createLabel="Record payment"
        onCreate={() => {
          resetRecord();
          setRecordOpen(true);
        }}
        filters={
          <div className="flex items-center gap-2">
            <Select
              value={methodFilter}
              onValueChange={(v) => setMethodFilter(v as typeof methodFilter)}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sourceFilter}
              onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="manual">Manual entries</SelectItem>
                <SelectItem value="auto">Auto / gateway</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />

      {/* Record dialog */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              For contributions, donations, and one-off collections. Dues-obligation payments
              (pay-on-behalf for a specific member) land on the Members page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="charge">Charge</Label>
              <Select
                value={recordForm.chargeId}
                onValueChange={(v) => setRecordForm((f) => ({ ...f, chargeId: v }))}
              >
                <SelectTrigger id="charge">
                  <SelectValue placeholder="Pick a charge" />
                </SelectTrigger>
                <SelectContent>
                  {chargeOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.scopeName} · {c.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {chargeOptions.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No active charges are available at scopes you can see. Create one first.
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="1"
                  value={recordForm.amount}
                  onChange={(e) => setRecordForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="25000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="method">Method</Label>
                <Select
                  value={recordForm.method}
                  onValueChange={(v) =>
                    setRecordForm((f) => ({ ...f, method: v as PaymentMethod }))
                  }
                >
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="memo">Memo (optional)</Label>
              <Input
                id="memo"
                value={recordForm.memo}
                onChange={(e) => setRecordForm((f) => ({ ...f, memo: e.target.value }))}
                placeholder="Note for the receipt / audit"
                maxLength={500}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="external">External reference (optional)</Label>
              <Input
                id="external"
                value={recordForm.externalRef}
                onChange={(e) => setRecordForm((f) => ({ ...f, externalRef: e.target.value }))}
                placeholder="Bank slip # or MoMo transaction id"
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRecordOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={runRecord} disabled={pending}>
              <CircleDollarSign className="h-4 w-4" />
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse dialog */}
      <Dialog open={!!reversing} onOpenChange={(o) => !o && setReversing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse this payment?</DialogTitle>
            <DialogDescription>
              Payments are append-only. Reversal inserts a new row that cancels the original in the
              ledger + treasury balance. Reason is required and lands in the audit trail.
            </DialogDescription>
          </DialogHeader>
          {reversing && (
            <div className="flex flex-col gap-3">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="text-sm text-foreground">
                  {new Intl.NumberFormat().format(reversing.amount)} {reversing.currency}
                </div>
                <div className="text-muted-foreground">
                  {reversing.payerLabel} · {reversing.chargeName} · {formatMethod(reversing.method)}
                </div>
                <div className="text-muted-foreground">
                  {new Date(reversing.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  rows={3}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="e.g. Provider double-charged the payer"
                  maxLength={500}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReversing(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={runReverse}
              disabled={pending}
            >
              <Undo2 className="h-4 w-4" />
              Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt preview + print dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-md print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Receipt</DialogTitle>
            <DialogDescription>
              Shareable receipt with a QR that verifies against the ledger. Use the browser print
              dialog for paper.
            </DialogDescription>
          </DialogHeader>
          {previewing && previewing.receiptToken && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Shesa
                  </div>
                  <div className="text-lg font-semibold text-foreground">Payment receipt</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Receipt #
                  </div>
                  <div className="text-sm text-foreground">{previewing.receiptNumber ?? '—'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-y border-border py-3 text-sm">
                <ReceiptField label="Amount">
                  <span className="font-semibold text-foreground">
                    {new Intl.NumberFormat().format(previewing.amount)} {previewing.currency}
                  </span>
                </ReceiptField>
                <ReceiptField label="Method">
                  <span className="text-foreground">{formatMethod(previewing.method)}</span>
                </ReceiptField>
                <ReceiptField label="For">
                  <span className="text-foreground">{previewing.chargeName}</span>
                </ReceiptField>
                <ReceiptField label="Payer">
                  <span className="text-foreground">{previewing.payerLabel}</span>
                </ReceiptField>
                <ReceiptField label="Paid on">
                  <span className="text-foreground">
                    {new Date(previewing.createdAt).toLocaleString()}
                  </span>
                </ReceiptField>
                <ReceiptField label="Scope">
                  <span className="text-foreground">{previewing.scopeName}</span>
                </ReceiptField>
              </div>
              <div className="flex items-center gap-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(
                    buildVerifyUrl(previewing.receiptToken),
                  )}`}
                  alt="Verify receipt"
                  width={120}
                  height={120}
                  className="rounded-md border border-border bg-white p-1"
                />
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>Scan or visit to verify:</span>
                  <span className="break-all text-[11px] text-foreground">
                    {buildVerifyUrl(previewing.receiptToken)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                previewing?.receiptToken && copyUrl(buildVerifyUrl(previewing.receiptToken))
              }
            >
              <Copy className="h-4 w-4" />
              Copy URL
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                previewing?.receiptToken &&
                window.open(buildVerifyUrl(previewing.receiptToken), '_blank', 'noopener')
              }
            >
              <ExternalLink className="h-4 w-4" />
              Open verify
            </Button>
            <Button type="button" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '—';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
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
