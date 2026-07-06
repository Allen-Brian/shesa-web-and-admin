'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, LandPlot, Undo2 } from 'lucide-react';

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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
}

export function PaymentsView({ payments, chargeOptions }: PaymentsViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'auto'>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordForm>(() => initialRecord(chargeOptions));
  const [reversing, setReversing] = useState<PaymentRow | null>(null);
  const [reverseReason, setReverseReason] = useState('');

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
        if (!q) return true;
        if (p.payerLabel.toLowerCase().includes(q)) return true;
        if (p.chargeName.toLowerCase().includes(q)) return true;
        if (p.scopeName.toLowerCase().includes(q)) return true;
        if (p.method.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((p, i) => ({ ...p, serial: i + 1 }));
  }, [payments, search, sourceFilter]);

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
              {p.data.chargeShape && (
                <span className="text-xs text-muted-foreground">
                  {p.data.scopeName} · {p.data.chargeShape}
                </span>
              )}
            </div>
          ) : null,
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
              className={`inline-flex items-center gap-1 font-mono text-sm ${
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
        headerName: 'Actions',
        colId: 'row_actions',
        width: 130,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const row = p.data;
          const isReversal = !!row.reversesPaymentId;
          const alreadyReversed = reversedIds.has(row.id);
          if (isReversal || alreadyReversed) return null;
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setReversing(row);
              }}
              disabled={pending}
              title="Reverse payment"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Reverse
            </Button>
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
          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="manual">Manual entries</SelectItem>
              <SelectItem value="auto">Auto / gateway</SelectItem>
            </SelectContent>
          </Select>
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
                <div className="font-mono text-sm text-foreground">
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
