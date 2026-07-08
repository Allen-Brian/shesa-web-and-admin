'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import {
  GradientPanel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shesa/ui';

export interface TreasuryEntry {
  readonly scopeId: string;
  readonly scopeSlug: string;
  readonly scopeName: string;
  readonly scopeType: string;
  readonly balance: number;
  readonly currency: string;
  readonly updatedAt: string;
  readonly thirtyDayIncome: number;
  readonly thirtyDayExpenses: number;
  readonly thirtyDayNet: number;
  readonly thirtyDayEntryCount: number;
}

export interface RecentEntry {
  readonly id: string;
  readonly createdAt: string;
  readonly direction: 'income' | 'expense';
  readonly amount: number;
  readonly currency: string;
  readonly counterparty: string;
  readonly scopeName: string;
  readonly scopeSlug: string;
  readonly isReversal: boolean;
  readonly memo: string | null;
}

type SortKey = 'name' | 'balance_desc' | 'balance_asc' | 'activity' | 'net_flow';
type ScopeTypeFilter = 'all' | 'mainstream' | 'branch' | 'chapter' | 'other';

interface Props {
  readonly treasuries: readonly TreasuryEntry[];
  readonly recentFeed: readonly RecentEntry[];
}

const SCOPE_TYPE_LABELS: Record<ScopeTypeFilter, string> = {
  all: 'All types',
  mainstream: 'Mainstream',
  branch: 'Branches',
  chapter: 'Chapters',
  other: 'Other',
};

export function TreasuryLandingView({ treasuries, recentFeed }: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [scopeType, setScopeType] = useState<ScopeTypeFilter>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = treasuries.filter((t) => {
      if (scopeType !== 'all') {
        const kind = normaliseScopeType(t.scopeType);
        if (kind !== scopeType) return false;
      }
      if (!q) return true;
      return (
        t.scopeName.toLowerCase().includes(q) ||
        t.scopeType.toLowerCase().includes(q) ||
        t.currency.toLowerCase().includes(q)
      );
    });
    return list.slice().sort((a, b) => {
      switch (sort) {
        case 'balance_desc':
          return b.balance - a.balance;
        case 'balance_asc':
          return a.balance - b.balance;
        case 'activity':
          return b.thirtyDayEntryCount - a.thirtyDayEntryCount;
        case 'net_flow':
          return b.thirtyDayNet - a.thirtyDayNet;
        case 'name':
        default:
          return a.scopeName.localeCompare(b.scopeName);
      }
    });
  }, [treasuries, search, sort, scopeType]);

  const kpis = useMemo(() => {
    const byCurrency = new Map<string, { balance: number; income: number; expenses: number }>();
    for (const t of treasuries) {
      const cur = byCurrency.get(t.currency) ?? { balance: 0, income: 0, expenses: 0 };
      cur.balance += t.balance;
      cur.income += t.thirtyDayIncome;
      cur.expenses += t.thirtyDayExpenses;
      byCurrency.set(t.currency, cur);
    }
    return {
      treasuryCount: treasuries.length,
      byCurrency,
      activeCount: treasuries.filter((t) => t.thirtyDayEntryCount > 0).length,
    };
  }, [treasuries]);

  const scopeTypeAvailable = useMemo(() => {
    const set = new Set<ScopeTypeFilter>();
    for (const t of treasuries) set.add(normaliseScopeType(t.scopeType));
    return set;
  }, [treasuries]);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wallet className="h-6 w-6" />
          Treasury
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every finance-bearing scope you can see, with its live balance and 30-day flow. Click a
          treasury for its full statement (opening / income / expenses / closing) and the movements
          behind it.
        </p>
      </header>

      {/* Aggregate summary — treasury count + per-currency total on hand + activity signal */}
      <SummaryStrip
        treasuryCount={kpis.treasuryCount}
        activeCount={kpis.activeCount}
        byCurrency={kpis.byCurrency}
      />

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search treasuries…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={scopeType} onValueChange={(v) => setScopeType(v as ScopeTypeFilter)}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(['mainstream', 'branch', 'chapter', 'other'] as const)
              .filter((t) => scopeTypeAvailable.has(t))
              .map((t) => (
                <SelectItem key={t} value={t}>
                  {SCOPE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort · Name</SelectItem>
            <SelectItem value="balance_desc">Sort · Balance high → low</SelectItem>
            <SelectItem value="balance_asc">Sort · Balance low → high</SelectItem>
            <SelectItem value="activity">Sort · Most active</SelectItem>
            <SelectItem value="net_flow">Sort · Net flow high → low</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {treasuries.length}{' '}
          {treasuries.length === 1 ? 'treasury' : 'treasuries'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((t) => (
          <TreasuryCard key={t.scopeId} t={t} />
        ))}
      </div>

      {filtered.length === 0 && (
        <GradientPanel className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No treasuries match this filter. Clear the search or switch the scope type.
          </p>
        </GradientPanel>
      )}

      {/* Recent activity — cross-treasury movement feed */}
      {recentFeed.length > 0 && <RecentActivity entries={recentFeed} />}
    </section>
  );
}

// ─── Summary strip ──────────────────────────────────────────────────

function SummaryStrip({
  treasuryCount,
  activeCount,
  byCurrency,
}: {
  readonly treasuryCount: number;
  readonly activeCount: number;
  readonly byCurrency: ReadonlyMap<string, { balance: number; income: number; expenses: number }>;
}) {
  const currencies = Array.from(byCurrency.entries()).sort((a, b) => b[1].balance - a[1].balance);
  const totalNet = Array.from(byCurrency.values()).reduce((a, b) => a + (b.income - b.expenses), 0);
  const singleCurrency = byCurrency.size === 1 ? currencies[0]![0] : null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <GradientPanel className="flex flex-col justify-between gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Treasuries in view
          </span>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground tabular-nums">
            {treasuryCount}
          </span>
          <span className="text-sm text-muted-foreground">
            {treasuryCount === 1 ? 'scope' : 'scopes'}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {activeCount} active in the last 30 days
        </div>
      </GradientPanel>

      <GradientPanel className="flex flex-col justify-between gap-3 p-5 md:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total on hand
          </span>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          {currencies.map(([currency, s]) => (
            <div key={currency} className="flex flex-col gap-0.5">
              <span className="text-3xl font-semibold leading-none text-foreground tabular-nums">
                {formatAmount(s.balance)}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {currency}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 text-[11px] text-muted-foreground">
          {singleCurrency ? (
            <NetFlowSpan
              net={totalNet}
              currency={singleCurrency}
              label={`vs 30 days ago · ${formatAmount(
                Array.from(byCurrency.values())[0]!.income,
              )} in / ${formatAmount(Array.from(byCurrency.values())[0]!.expenses)} out`}
            />
          ) : (
            <span>Aggregated per currency · cross-currency roll-ups live in Reports.</span>
          )}
        </div>
      </GradientPanel>
    </div>
  );
}

function NetFlowSpan({
  net,
  currency,
  label,
}: {
  readonly net: number;
  readonly currency: string;
  readonly label: string;
}) {
  const positive = net > 0;
  const negative = net < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const tone = positive
    ? 'text-emerald-600 dark:text-emerald-400'
    : negative
      ? 'text-destructive'
      : 'text-muted-foreground';
  return (
    <>
      <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
        <Icon className="h-3 w-3" />
        {net >= 0 ? '+' : ''}
        {formatAmount(net)} {currency}
      </span>
      <span>{label}</span>
    </>
  );
}

// ─── Treasury card ──────────────────────────────────────────────────

function TreasuryCard({ t }: { readonly t: TreasuryEntry }) {
  const negative = t.balance < 0;
  const href = t.scopeSlug ? `/finance/treasury/${t.scopeSlug}` : '#';
  const netTone =
    t.thirtyDayNet > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : t.thirtyDayNet < 0
        ? 'text-destructive'
        : 'text-muted-foreground';
  const NetIcon = t.thirtyDayNet > 0 ? TrendingUp : t.thirtyDayNet < 0 ? TrendingDown : Minus;

  return (
    <Link href={href} className="group block">
      <GradientPanel className="flex flex-col gap-5 p-5 transition-all group-hover:border-primary/50 group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="truncate text-base font-semibold text-foreground">{t.scopeName}</span>
            <span className="w-fit rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t.scopeType}
            </span>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <Wallet className="h-4 w-4" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Balance
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-3xl font-semibold leading-none tabular-nums ${
                negative ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {formatAmount(t.balance)}
            </span>
            <span className="text-sm font-medium text-muted-foreground">{t.currency}</span>
          </div>
        </div>

        {/* 30-day activity row — surfaces income + expenses + net so
         * operators can spot a stalled treasury before opening the
         * statement. */}
        <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Last 30 days</span>
            <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${netTone}`}>
              <NetIcon className="h-3 w-3" />
              {t.thirtyDayNet >= 0 ? '+' : ''}
              {formatAmount(t.thirtyDayNet)}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-[11px] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-600" />
              {formatAmount(t.thirtyDayIncome)} in
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-destructive" />
              {formatAmount(t.thirtyDayExpenses)} out
            </span>
            <span>
              {t.thirtyDayEntryCount} entr{t.thirtyDayEntryCount === 1 ? 'y' : 'ies'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span>Updated {formatRelative(t.updatedAt)}</span>
          <span className="inline-flex items-center gap-0.5 font-medium text-primary transition-transform group-hover:translate-x-0.5">
            View statement
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </GradientPanel>
    </Link>
  );
}

// ─── Recent activity feed ───────────────────────────────────────────

function RecentActivity({ entries }: { readonly entries: readonly RecentEntry[] }) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">Recent activity</span>
        <span className="text-xs text-muted-foreground">
          {entries.length} most recent movement{entries.length === 1 ? '' : 's'} · click a scope to
          open its statement
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border/50">
        {entries.map((e) => {
          const isIncome = e.direction === 'income';
          const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
          const tone = isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive';
          const scopeHref = e.scopeSlug ? `/finance/treasury/${e.scopeSlug}` : null;
          return (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isIncome ? 'bg-emerald-500/10' : 'bg-destructive/10'
                }`}
              >
                <Icon className={`h-4 w-4 ${tone}`} />
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">
                  {e.counterparty}
                  {e.isReversal && (
                    <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      reversal
                    </span>
                  )}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {scopeHref ? (
                    <Link href={scopeHref} className="hover:text-foreground hover:underline">
                      {e.scopeName}
                    </Link>
                  ) : (
                    e.scopeName
                  )}
                  {e.memo && <> · {e.memo}</>}
                </span>
              </div>
              <div className="ml-auto flex flex-col items-end leading-tight">
                <span className={`text-sm font-medium tabular-nums ${tone}`}>
                  {isIncome ? '+' : '−'}
                  {formatAmount(e.amount)} {e.currency}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatRelative(e.createdAt)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </GradientPanel>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function normaliseScopeType(raw: string): ScopeTypeFilter {
  if (raw === 'mainstream') return 'mainstream';
  if (raw === 'branch') return 'branch';
  if (raw === 'chapter') return 'chapter';
  return 'other';
}

function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat().format(rounded);
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.round((now - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}
