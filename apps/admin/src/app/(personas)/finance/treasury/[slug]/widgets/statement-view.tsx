'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Download,
  Minus,
  Plus,
  Wallet,
} from 'lucide-react';

import {
  Badge,
  DataTable,
  GradientPanel,
  Input,
  type ColDef,
  type ICellRendererParams,
} from '@shesa/ui';

export type Period = '30d' | '90d' | 'mtd' | 'ytd' | 'all';

export interface StatementSummary {
  readonly currency: string;
  readonly opening: number;
  readonly income: number;
  readonly expenses: number;
  readonly closing: number;
  readonly liveBalance: number;
  readonly liveUpdatedAt: string | null;
  readonly windowFrom: string | null;
  readonly windowTo: string;
}

export interface Entry {
  readonly id: string;
  readonly createdAt: string;
  readonly direction: 'income' | 'expense';
  readonly amount: number;
  readonly currency: string;
  readonly counterparty: string;
  readonly subtitle: string;
  readonly memo: string | null;
  readonly sourceKind: 'payment' | 'expense' | 'other';
  readonly sourceMethod: string | null;
  readonly sourceLabel: string | null;
  readonly isReversal: boolean;
}

type SerialEntry = Entry & { readonly serial: number };

interface Props {
  readonly scopeName: string;
  readonly scopeType: string;
  readonly scopeSlug: string;
  readonly period: Period;
  readonly summary: StatementSummary;
  readonly entries: readonly Entry[];
}

const PERIOD_OPTIONS: readonly { value: Period; label: string }[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
];

export function StatementView({
  scopeName,
  scopeType,
  scopeSlug,
  period,
  summary,
  entries,
}: Props) {
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filtered = useMemo<readonly SerialEntry[]>(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (directionFilter !== 'all' && e.direction !== directionFilter) return false;
        if (!q) return true;
        if (e.counterparty.toLowerCase().includes(q)) return true;
        if (e.subtitle.toLowerCase().includes(q)) return true;
        if (e.memo?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((e, i) => ({ ...e, serial: i + 1 }));
  }, [entries, search, directionFilter]);

  const columnDefs = useMemo<ColDef<SerialEntry>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 68,
        maxWidth: 68,
        sortable: false,
        filter: false,
      },
      {
        headerName: 'When',
        field: 'createdAt',
        width: 180,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
      },
      {
        headerName: 'Movement',
        field: 'counterparty',
        flex: 2,
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams<SerialEntry>) => {
          if (!p.data) return null;
          return (
            <div className="flex flex-col leading-tight">
              <span className="font-medium text-foreground">{p.data.counterparty}</span>
              {p.data.subtitle && (
                <span className="text-xs text-muted-foreground">{p.data.subtitle}</span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Direction',
        field: 'direction',
        width: 130,
        cellRenderer: (p: ICellRendererParams<SerialEntry, string>) => {
          if (!p.data) return null;
          const income = p.data.direction === 'income';
          return (
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${
                income ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
              }`}
            >
              {income ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {income ? 'Income' : 'Expense'}
              {p.data.isReversal && <span className="text-[10px] text-amber-600">·rev</span>}
            </span>
          );
        },
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 160,
        cellRenderer: (p: ICellRendererParams<SerialEntry>) => {
          if (!p.data) return null;
          const income = p.data.direction === 'income';
          return (
            <span
              className={`text-sm font-medium tabular-nums ${
                income ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
              }`}
            >
              {income ? '+' : '−'}
              {new Intl.NumberFormat().format(p.data.amount)} {p.data.currency}
            </span>
          );
        },
      },
      {
        headerName: 'Via',
        field: 'sourceLabel',
        width: 100,
        cellRenderer: (p: ICellRendererParams<SerialEntry, string>) => {
          if (!p.data || !p.value) return null;
          return (
            <Badge
              variant="outline"
              className={
                p.value === 'Auto'
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                  : 'border-border text-foreground'
              }
            >
              {p.value}
            </Badge>
          );
        },
      },
      {
        headerName: 'Memo',
        field: 'memo',
        flex: 1,
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams<SerialEntry, string>) =>
          p.value ? (
            <span className="text-xs text-muted-foreground">{p.value}</span>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <Header
        scopeName={scopeName}
        scopeType={scopeType}
        liveBalance={summary.liveBalance}
        liveUpdatedAt={summary.liveUpdatedAt}
        currency={summary.currency}
      />

      <PeriodBar current={period} scopeSlug={scopeSlug} entriesCount={entries.length} />

      <StatementFlow summary={summary} />

      <GradientPanel className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-foreground">Movements</h2>
            <p className="text-xs text-muted-foreground">
              Every ledger entry in this window. Payments and expenses each write one row here.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {entries.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            placeholder="Search payer, charge, memo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64"
          />
          <div className="flex gap-1 rounded-lg border border-border bg-background/60 p-0.5">
            {(['all', 'income', 'expense'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDirectionFilter(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  directionFilter === v
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v === 'all' ? 'All' : v === 'income' ? 'Income' : 'Expenses'}
              </button>
            ))}
          </div>
        </div>

        <DataTable<SerialEntry>
          rowData={filtered as SerialEntry[]}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          showColumnPicker={false}
          selectable={false}
        />
      </GradientPanel>
    </div>
  );
}

function Header({
  scopeName,
  scopeType,
  liveBalance,
  liveUpdatedAt,
  currency,
}: {
  readonly scopeName: string;
  readonly scopeType: string;
  readonly liveBalance: number;
  readonly liveUpdatedAt: string | null;
  readonly currency: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/finance/treasury"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to treasuries
      </Link>

      <GradientPanel className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Treasury Statement
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{scopeName}</h1>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {scopeType}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Live balance
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-3xl font-semibold tabular-nums leading-none ${
                  liveBalance < 0 ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {new Intl.NumberFormat().format(liveBalance)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{currency}</span>
            </div>
            {liveUpdatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {new Date(liveUpdatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </GradientPanel>
    </div>
  );
}

function PeriodBar({
  current,
  scopeSlug,
  entriesCount,
}: {
  readonly current: Period;
  readonly scopeSlug: string;
  readonly entriesCount: number;
}) {
  const router = useRouter();
  const search = useSearchParams();

  const setPeriod = (p: Period) => {
    const params = new URLSearchParams(search?.toString());
    params.set('period', p);
    router.push(`/finance/treasury/${scopeSlug}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <GradientPanel muted className="flex flex-wrap gap-1 rounded-xl p-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPeriod(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              current === opt.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </GradientPanel>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {entriesCount} {entriesCount === 1 ? 'movement' : 'movements'} in window
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" />
          Print / PDF
        </button>
      </div>
    </div>
  );
}

function StatementFlow({ summary }: { readonly summary: StatementSummary }) {
  const { opening, income, expenses, closing, currency, windowFrom, windowTo } = summary;
  const net = income - expenses;
  const windowLabel =
    (windowFrom ? new Date(windowFrom).toLocaleDateString() : 'Beginning') +
    ' → ' +
    new Date(windowTo).toLocaleDateString();

  return (
    <GradientPanel className="p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground">Statement summary</h2>
          <p className="text-xs text-muted-foreground">{windowLabel}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Net movement
          </div>
          <div
            className={`text-lg font-semibold tabular-nums ${
              net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
            }`}
          >
            {net >= 0 ? '+' : '−'}
            {new Intl.NumberFormat().format(Math.abs(net))} {currency}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <FlowCell label="Opening" value={opening} currency={currency} hint="Balance carried in" />
        <FlowCell
          label="Income"
          value={income}
          currency={currency}
          hint="Payments received"
          accent="income"
          icon={<Plus className="h-3.5 w-3.5" />}
        />
        <FlowCell
          label="Expenses"
          value={expenses}
          currency={currency}
          hint="Money out"
          accent="expense"
          icon={<Minus className="h-3.5 w-3.5" />}
        />
        <FlowCell
          label="Closing"
          value={closing}
          currency={currency}
          hint="Balance carried out"
          emphasise
        />
      </div>
    </GradientPanel>
  );
}

function FlowCell({
  label,
  value,
  currency,
  hint,
  accent,
  icon,
  emphasise,
}: {
  readonly label: string;
  readonly value: number;
  readonly currency: string;
  readonly hint: string;
  readonly accent?: 'income' | 'expense';
  readonly icon?: React.ReactNode;
  readonly emphasise?: boolean;
}) {
  const valueClass =
    accent === 'income'
      ? 'text-emerald-700 dark:text-emerald-400'
      : accent === 'expense'
        ? 'text-destructive'
        : value < 0
          ? 'text-destructive'
          : 'text-foreground';

  return (
    <GradientPanel
      muted={!emphasise}
      className={`flex flex-col gap-1.5 rounded-xl p-4 ${emphasise ? 'border-primary/40' : ''}`}
      style={
        emphasise
          ? { background: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-card))' }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span
            className={
              accent === 'income'
                ? 'text-emerald-600'
                : accent === 'expense'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }
          >
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-semibold tabular-nums leading-none ${valueClass}`}>
          {new Intl.NumberFormat().format(value)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{currency}</span>
      </div>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </GradientPanel>
  );
}
