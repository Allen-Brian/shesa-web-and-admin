'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Plus, Receipt, Undo2, Wallet } from 'lucide-react';

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
  NativeDateInput,
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

import { approveExpense, recordExpense, reverseExpense } from '../actions';

export interface ExpenseRow {
  readonly id: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly categoryKey: string | null;
  readonly categoryName: string | null;
  readonly payee: string;
  readonly amount: number;
  readonly currency: string;
  readonly description: string | null;
  readonly status: string;
  readonly reversesExpenseId: string | null;
  readonly isReversed: boolean;
  readonly incurredAt: string;
  readonly createdAt: string;
}

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
  readonly threshold: number | null;
}

export interface CategoryOption {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

type SerialRow = ExpenseRow & { readonly serial: number };

interface RecordForm {
  scopeId: string;
  categoryId: string;
  payee: string;
  amount: string;
  description: string;
  incurredAt: string;
}

const initialRecord = (scopeOptions: readonly ScopeOption[]): RecordForm => ({
  scopeId: scopeOptions[0]?.id ?? '',
  categoryId: '',
  payee: '',
  amount: '',
  description: '',
  incurredAt: new Date().toISOString().slice(0, 10),
});

interface ExpensesViewProps {
  readonly expenses: readonly ExpenseRow[];
  readonly scopeOptions: readonly ScopeOption[];
  readonly categoryOptions: readonly CategoryOption[];
}

export function ExpensesView({ expenses, scopeOptions, categoryOptions }: ExpensesViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'recorded' | 'pending_approval' | 'approved'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordForm>(() => initialRecord(scopeOptions));
  const [reversing, setReversing] = useState<ExpenseRow | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const canRecord = scopeOptions.length > 0;

  const selectedScopeForRecord = scopeOptions.find((s) => s.id === recordForm.scopeId);
  const recordAmountNum = recordForm.amount ? parseFloat(recordForm.amount) : null;
  const willBePending =
    selectedScopeForRecord?.threshold != null &&
    recordAmountNum != null &&
    recordAmountNum >= selectedScopeForRecord.threshold;

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return expenses
      .filter((e) => {
        if (statusFilter !== 'all' && e.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && e.categoryKey !== categoryFilter) return false;
        if (!q) return true;
        if (e.payee.toLowerCase().includes(q)) return true;
        if (e.scopeName.toLowerCase().includes(q)) return true;
        if (e.categoryName?.toLowerCase().includes(q)) return true;
        if (e.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((e, i) => ({ ...e, serial: i + 1 }));
  }, [expenses, search, statusFilter, categoryFilter]);

  // KPI totals — computed from the full expense set so filtering
  // doesn't jitter the strip. Reversals subtract from spent totals; a
  // separate reversal count surfaces so an anomaly is visible.
  const kpis = useMemo(() => {
    const currencies = new Map<string, number>();
    let pending = 0;
    let reversalCount = 0;
    for (const e of expenses) {
      if (e.reversesExpenseId) {
        reversalCount += 1;
        // A reversal row adds money back — subtract from spent.
        currencies.set(e.currency, (currencies.get(e.currency) ?? 0) - e.amount);
      } else {
        currencies.set(e.currency, (currencies.get(e.currency) ?? 0) + e.amount);
        if (e.status === 'pending_approval') pending += 1;
      }
    }
    const primaryCurrency = currencies.size === 1 ? currencies.keys().next().value : undefined;
    const netSpent =
      primaryCurrency !== undefined ? Math.max(0, currencies.get(primaryCurrency)!) : null;
    const settledExpenses = expenses.filter((e) => !e.reversesExpenseId && !e.isReversed);
    const avg =
      settledExpenses.length > 0
        ? settledExpenses.reduce((a, b) => a + b.amount, 0) / settledExpenses.length
        : 0;
    return {
      total: expenses.length,
      pending,
      reversalCount,
      primaryCurrency,
      netSpent,
      avg,
      settledCount: settledExpenses.length,
    };
  }, [expenses]);

  const resetRecord = () => setRecordForm(initialRecord(scopeOptions));

  const runRecord = () => {
    if (!recordForm.scopeId) {
      toast.error('Pick a scope.');
      return;
    }
    if (!recordForm.payee.trim()) {
      toast.error('Payee is required.');
      return;
    }
    const amount = parseFloat(recordForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a positive amount.');
      return;
    }
    const scope = scopeOptions.find((s) => s.id === recordForm.scopeId);
    if (!scope) {
      toast.error('Invalid scope.');
      return;
    }

    startTransition(async () => {
      const result = await recordExpense({
        scopeId: scope.id,
        categoryId: recordForm.categoryId || null,
        payee: recordForm.payee.trim(),
        amount,
        currency: scope.currency,
        description: recordForm.description.trim() || null,
        incurredAt: new Date(recordForm.incurredAt).toISOString(),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const status = result.data?.status;
      toast.success(
        status === 'pending_approval'
          ? 'Expense recorded — waiting for admin approval (above threshold).'
          : 'Expense recorded and posted to the ledger.',
      );
      setRecordOpen(false);
      resetRecord();
      router.refresh();
    });
  };

  const runApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveExpense(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Expense approved and posted to the ledger.');
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
      const result = await reverseExpense(id, reason);
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
        headerName: 'Incurred',
        field: 'incurredAt',
        width: 130,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
      {
        headerName: 'Payee',
        field: 'payee',
        flex: 2,
        minWidth: 240,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => {
          if (!p.data) return null;
          return (
            <div className="flex h-full items-center gap-2.5 py-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">{p.data.payee}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {p.data.scopeName}
                  {p.data.description && ` · ${p.data.description}`}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Category',
        field: 'categoryName',
        width: 150,
        cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) =>
          p.value ? (
            <Badge variant="outline" className="border-border/60 text-foreground">
              {p.value}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 150,
        cellRenderer: (p: ICellRendererParams<SerialRow, number>) => {
          if (!p.data) return null;
          const isReversalRow = !!p.data.reversesExpenseId;
          return (
            <span
              className={`text-sm ${
                isReversalRow ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
              }`}
            >
              {isReversalRow ? '+' : '−'}
              {new Intl.NumberFormat().format(p.data.amount)} {p.data.currency}
            </span>
          );
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 160,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => {
          if (!p.data) return null;
          if (p.data.reversesExpenseId) {
            return (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
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
          return <StatusBadge status={p.value ?? ''} />;
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
          const isReversal = !!row.reversesExpenseId;
          if (isReversal) return null;

          const canApprove = row.status === 'pending_approval';
          const canReverse =
            (row.status === 'recorded' || row.status === 'approved') && !row.isReversed;

          return (
            <div className="flex items-center gap-1">
              {canApprove && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    runApprove(row.id);
                  }}
                  disabled={pending}
                  title="Approve"
                >
                  <CircleCheck className="h-3.5 w-3.5" />
                  Approve
                </Button>
              )}
              {canReverse && (
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
                  title="Reverse"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [pending],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wallet className="h-6 w-6" />
          Expenses
        </h1>
        <p className="text-sm text-muted-foreground">
          Money out of a treasury. Below the body&apos;s threshold: hits the ledger immediately.
          Above: enters pending approval — the Admin approves to release.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Expenses" value={kpis.total} />
        <StatsCard
          label="Net spent"
          value={
            kpis.primaryCurrency && kpis.netSpent !== null
              ? `${new Intl.NumberFormat().format(Math.round(kpis.netSpent))} ${kpis.primaryCurrency}`
              : '—'
          }
        />
        <StatsCard
          label="Avg. amount"
          value={
            kpis.primaryCurrency && kpis.settledCount > 0
              ? `${new Intl.NumberFormat().format(Math.round(kpis.avg))} ${kpis.primaryCurrency}`
              : '—'
          }
        />
        <StatsCard label="Pending approval" value={kpis.pending} />
        <StatsCard label="Reversals" value={kpis.reversalCount} />
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'expense' : 'expenses'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canRecord}
        createLabel="Record expense"
        onCreate={() => {
          resetRecord();
          setRecordOpen(true);
        }}
        filters={
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.key}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="recorded">Recorded</SelectItem>
                <SelectItem value="pending_approval">Pending approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
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
            <DialogTitle>Record an expense</DialogTitle>
            <DialogDescription>
              Money out of a scope&apos;s treasury. Amount and every other field are frozen once
              recorded — corrections are reversal rows, not edits.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scope">Scope</Label>
              <Select
                value={recordForm.scopeId}
                onValueChange={(v) => setRecordForm((f) => ({ ...f, scopeId: v }))}
              >
                <SelectTrigger id="scope">
                  <SelectValue placeholder="Pick a scope" />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.currency}
                      {s.threshold != null &&
                        ` · threshold ${new Intl.NumberFormat().format(s.threshold)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payee">Payee</Label>
              <Input
                id="payee"
                value={recordForm.payee}
                onChange={(e) => setRecordForm((f) => ({ ...f, payee: e.target.value }))}
                placeholder="e.g. Community Hall"
                maxLength={200}
              />
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
                  placeholder="12000"
                />
                {willBePending && (
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    ≥ threshold — will enter pending_approval.
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={recordForm.categoryId}
                  onValueChange={(v) => setRecordForm((f) => ({ ...f, categoryId: v }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                rows={2}
                value={recordForm.description}
                onChange={(e) => setRecordForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this expense is for."
                maxLength={2000}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incurred">Incurred date</Label>
              <NativeDateInput
                id="incurred"
                value={recordForm.incurredAt}
                onChange={(v) => setRecordForm((f) => ({ ...f, incurredAt: v }))}
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
              <Plus className="h-4 w-4" />
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse dialog */}
      <Dialog open={!!reversing} onOpenChange={(o) => !o && setReversing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse this expense?</DialogTitle>
            <DialogDescription>
              Inserts a new expense row that cancels the original in the ledger + treasury balance.
              Reason is required.
            </DialogDescription>
          </DialogHeader>
          {reversing && (
            <div className="flex flex-col gap-3">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="text-sm text-foreground">
                  {new Intl.NumberFormat().format(reversing.amount)} {reversing.currency}
                </div>
                <div className="text-muted-foreground">
                  {reversing.payee} · {reversing.scopeName}
                  {reversing.categoryName && ` · ${reversing.categoryName}`}
                </div>
                <div className="text-muted-foreground">
                  Incurred {new Date(reversing.incurredAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  rows={3}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="e.g. Vendor refunded — event postponed"
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

function StatusBadge({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    recorded: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    pending_approval: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    approved: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  };
  const label =
    status === 'pending_approval'
      ? 'Pending approval'
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border text-foreground'}>
      {label}
    </Badge>
  );
}
