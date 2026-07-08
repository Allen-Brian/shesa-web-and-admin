'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CreditCard } from 'lucide-react';

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
  StatsCard,
  Textarea,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

import { recordAssessmentPayment, type PaymentMethod } from '../actions';

export interface AssessmentRow {
  readonly id: string;
  readonly chargeId: string;
  readonly scopeId: string;
  readonly chargeName: string;
  readonly imposerName: string;
  readonly recurrence: string;
  readonly branchName: string;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly amount: number;
  readonly paid: number;
  readonly outstanding: number;
  readonly currency: string;
  readonly status: string;
}

type SerialRow = AssessmentRow & { readonly serial: number };

interface Props {
  readonly rows: readonly AssessmentRow[];
}

const METHODS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
];

interface PaymentDraft {
  readonly row: AssessmentRow;
  amount: string;
  method: PaymentMethod;
  memo: string;
  externalRef: string;
}

const buildDraft = (row: AssessmentRow): PaymentDraft => ({
  row,
  // Default to the remaining outstanding — the common case for a
  // branch settling this month's levy. If the row is already fully
  // paid, default to the full amount so the operator can see the max.
  amount: (row.outstanding > 0 ? row.outstanding : row.amount).toString(),
  method: 'mtn_momo',
  memo: '',
  externalRef: '',
});

export function ExcoAssessmentsView({ rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (!q) return true;
        if (r.chargeName.toLowerCase().includes(q)) return true;
        if (r.branchName.toLowerCase().includes(q)) return true;
        if (r.imposerName.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rows, search, statusFilter]);

  const kpis = useMemo(() => {
    const currencies = new Map<string, { expected: number; paid: number; outstanding: number }>();
    let paid = 0;
    let outstanding = 0;
    for (const r of rows) {
      const cur = currencies.get(r.currency) ?? { expected: 0, paid: 0, outstanding: 0 };
      cur.expected += r.amount;
      cur.paid += r.paid;
      cur.outstanding += r.outstanding;
      currencies.set(r.currency, cur);
      if (r.status === 'paid') paid += 1;
      else if (r.status === 'open' || r.status === 'partial') outstanding += 1;
    }
    return {
      total: rows.length,
      paid,
      outstanding,
      currencies,
    };
  }, [rows]);

  const openDraftFor = (row: AssessmentRow) => setDraft(buildDraft(row));

  const runRecord = () => {
    if (!draft) return;
    const parsed = parseFloat(draft.amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }
    if (parsed > draft.row.outstanding + 0.01 && draft.row.outstanding > 0) {
      // Guard against over-payment — Finance's Edge Function will
      // refuse it too, but the local check saves a round-trip.
      toast.error(
        `Only ${new Intl.NumberFormat().format(draft.row.outstanding)} ${draft.row.currency} remaining on this assessment.`,
      );
      return;
    }
    const target = draft;
    startTransition(async () => {
      const result = await recordAssessmentPayment({
        obligationId: target.row.id,
        amount: parsed,
        currency: target.row.currency,
        method: target.method,
        memo: target.memo.trim() || undefined,
        externalRef: target.externalRef.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Payment recorded.');
      setDraft(null);
      router.refresh();
    });
  };

  const columnDefs = useMemo<ColDef<SerialRow>[]>(
    () => [
      {
        headerName: '#',
        field: 'serial',
        width: 56,
        maxWidth: 56,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Assessment',
        field: 'chargeName',
        flex: 2.4,
        minWidth: 240,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          return (
            <div className="flex h-full items-center gap-2.5 py-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">
                  {p.data.chargeName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  by {p.data.imposerName}
                  {p.data.recurrence && ` · ${formatRecurrence(p.data.recurrence)}`}
                </span>
              </div>
            </div>
          );
        },
      },
      { headerName: 'On branch', field: 'branchName', width: 150 },
      {
        headerName: 'Period',
        field: 'periodStart',
        width: 170,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const start = p.data.periodStart;
          const end = p.data.periodEnd;
          if (!start) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs text-muted-foreground">
              {new Date(start).toLocaleDateString()}
              {end && ` → ${new Date(end).toLocaleDateString()}`}
            </span>
          );
        },
      },
      {
        headerName: 'Progress',
        colId: 'progress',
        flex: 1.6,
        minWidth: 200,
        valueGetter: (p) => {
          const r = p.data as SerialRow | undefined;
          if (!r) return 0;
          return r.amount > 0 ? r.paid / r.amount : 0;
        },
        cellRenderer: (p: ICellRendererParams<SerialRow>) =>
          p.data ? <ProgressCell row={p.data} /> : null,
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 110,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <StatusBadge status={p.value ?? ''} />
        ),
      },
      {
        headerName: '',
        colId: 'row_pay',
        width: 130,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const canRecord = p.data.status !== 'paid' && p.data.status !== 'cancelled';
          return (
            <Button
              type="button"
              variant={canRecord ? 'default' : 'outline'}
              size="sm"
              className="h-7 gap-1.5"
              disabled={!canRecord}
              onClick={(e) => {
                e.stopPropagation();
                openDraftFor(p.data!);
              }}
            >
              <CreditCard className="h-3.5 w-3.5" />
              {p.data.status === 'partial' ? 'Add pay' : 'Record'}
            </Button>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Assessments" value={kpis.total} />
        <StatsCard label="Outstanding" value={kpis.outstanding} />
        <StatsCard label="Paid" value={kpis.paid} />
        <StatsCard
          label="Total outstanding"
          value={
            kpis.currencies.size === 1
              ? (() => {
                  const first = kpis.currencies.entries().next().value;
                  if (!first) return '—';
                  const [cur, amt] = first;
                  return `${new Intl.NumberFormat().format(Math.round(amt.outstanding))} ${cur}`;
                })()
              : '—'
          }
        />
      </div>

      {/* Per-currency outstanding chips — surfaces when portfolio is
       * multi-currency (rare for a single branch, common for global). */}
      {kpis.currencies.size > 1 && (
        <div className="flex flex-wrap gap-3">
          {Array.from(kpis.currencies.entries()).map(([currency, s]) => (
            <div
              key={currency}
              className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Outstanding · {currency}
              </span>
              <span className="text-xl font-semibold text-foreground tabular-nums">
                {new Intl.NumberFormat().format(Math.round(s.outstanding))}
              </span>
            </div>
          ))}
        </div>
      )}

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'assessment' : 'assessments'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
        filters={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="forgiven">Forgiven</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e) => {
          if (!e.data) return;
          if (e.data.status === 'paid' || e.data.status === 'cancelled') return;
          openDraftFor(e.data);
        }}
        showColumnPicker={false}
        selectable={false}
      />

      <PaymentDialog
        draft={draft}
        pending={pending}
        onChange={(next) => setDraft(next)}
        onClose={() => setDraft(null)}
        onConfirm={runRecord}
      />
    </div>
  );
}

// ─── Progress cell ──────────────────────────────────────────────────

function ProgressCell({ row }: { readonly row: SerialRow }) {
  const percent = row.amount > 0 ? Math.min(100, Math.round((row.paid / row.amount) * 100)) : 0;
  const barColor =
    percent >= 100
      ? 'bg-emerald-500'
      : percent >= 70
        ? 'bg-sky-500'
        : percent >= 40
          ? 'bg-amber-500'
          : 'bg-destructive';
  return (
    <div className="flex w-full flex-col gap-1 py-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground tabular-nums">
          {new Intl.NumberFormat().format(Math.round(row.paid))} {row.currency}
        </span>
        <span className="text-muted-foreground tabular-nums">
          of {new Intl.NumberFormat().format(Math.round(row.amount))}
          <span
            className={`ml-1 font-medium ${
              percent >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
            }`}
          >
            · {percent}%
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// ─── Payment dialog ─────────────────────────────────────────────────

function PaymentDialog({
  draft,
  pending,
  onChange,
  onClose,
  onConfirm,
}: {
  readonly draft: PaymentDraft | null;
  readonly pending: boolean;
  readonly onChange: (next: PaymentDraft) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  const open = draft !== null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {draft ? (
          <>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>
                Settle an assessment against your branch. Payments land as a manual entry with you
                as the recorder.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              {/* Assessment summary */}
              <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-foreground">{draft.row.chargeName}</span>
                  <StatusBadge status={draft.row.status} />
                </div>
                <span className="text-muted-foreground">
                  {draft.row.imposerName}
                  {draft.row.periodStart && (
                    <>
                      {' · '}
                      {new Date(draft.row.periodStart).toLocaleDateString()}
                      {draft.row.periodEnd &&
                        ` → ${new Date(draft.row.periodEnd).toLocaleDateString()}`}
                    </>
                  )}
                </span>
                <div className="mt-1 grid grid-cols-3 gap-2 border-t border-border/60 pt-2">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Owed</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {new Intl.NumberFormat().format(Math.round(draft.row.amount))}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {new Intl.NumberFormat().format(Math.round(draft.row.paid))}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Remaining</span>
                    <span
                      className={`font-medium tabular-nums ${
                        draft.row.outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}
                    >
                      {draft.row.outstanding > 0
                        ? new Intl.NumberFormat().format(Math.round(draft.row.outstanding))
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-amount">Amount ({draft.row.currency})</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={draft.amount}
                  onChange={(e) => onChange({ ...draft, amount: e.target.value })}
                />
                {draft.row.outstanding > 0 && (
                  <div className="flex gap-2 text-[10px]">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() =>
                        onChange({ ...draft, amount: draft.row.outstanding.toString() })
                      }
                    >
                      Pay remaining (
                      {new Intl.NumberFormat().format(Math.round(draft.row.outstanding))})
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() =>
                        onChange({
                          ...draft,
                          amount: Math.round(draft.row.outstanding / 2).toString(),
                        })
                      }
                    >
                      Pay half
                    </button>
                  </div>
                )}
              </div>

              {/* Method */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-method">Method</Label>
                <Select
                  value={draft.method}
                  onValueChange={(v) => onChange({ ...draft, method: v as PaymentMethod })}
                >
                  <SelectTrigger id="pay-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* External ref */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-ref">External reference (optional)</Label>
                <Input
                  id="pay-ref"
                  value={draft.externalRef}
                  onChange={(e) => onChange({ ...draft, externalRef: e.target.value })}
                  placeholder="Transaction id, receipt no., bank slip…"
                  maxLength={200}
                />
              </div>

              {/* Memo */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-memo">Note (optional)</Label>
                <Textarea
                  id="pay-memo"
                  rows={2}
                  value={draft.memo}
                  onChange={(e) => onChange({ ...draft, memo: e.target.value })}
                  placeholder="Anything the treasurer should know."
                  maxLength={500}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onConfirm}
                disabled={pending}
                className="gap-1.5"
              >
                <CreditCard className="h-4 w-4" />
                Record payment
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function StatusBadge({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    open: 'border-destructive/40 bg-destructive/10 text-destructive',
    partial: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    paid: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    cancelled: 'border-border bg-muted/30 text-muted-foreground',
    forgiven: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  };
  return (
    <Badge variant="outline" className={`capitalize ${styles[status] ?? 'border-border'}`}>
      {status || '—'}
    </Badge>
  );
}

function formatRecurrence(rec: string): string {
  switch (rec) {
    case 'one_time':
      return 'One-time';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'biannual':
      return 'Bi-annual';
    case 'yearly':
      return 'Yearly';
    default:
      return rec;
  }
}
