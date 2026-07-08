'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BadgeDollarSign,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Crown,
  MapPin,
  Minus,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge, GradientPanel } from '@shesa/ui';

// ─── Event type color palette ───────────────────────────────────────
// Each event type maps to a Tailwind hue + hex triple so both the
// calendar dots (bg class) and the upcoming-events chips (badge)
// render in a single consistent voice. Fallback for unknown types is
// the primary color.

const EVENT_TYPE_STYLE: Record<
  string,
  { readonly dot: string; readonly badge: string; readonly hex: string }
> = {
  sports: {
    dot: 'bg-emerald-500',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    hex: '#10b981',
  },
  entertainment: {
    dot: 'bg-fuchsia-500',
    badge: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400',
    hex: '#d946ef',
  },
  meeting: {
    dot: 'bg-sky-500',
    badge: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    hex: '#0ea5e9',
  },
  mentorship: {
    dot: 'bg-violet-500',
    badge: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400',
    hex: '#8b5cf6',
  },
  assembly: {
    dot: 'bg-indigo-500',
    badge: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    hex: '#6366f1',
  },
  networking: {
    dot: 'bg-teal-500',
    badge: 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-400',
    hex: '#14b8a6',
  },
  fundraiser: {
    dot: 'bg-amber-500',
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    hex: '#f59e0b',
  },
  community_service: {
    dot: 'bg-lime-500',
    badge: 'border-lime-500/40 bg-lime-500/10 text-lime-700 dark:text-lime-500',
    hex: '#84cc16',
  },
  cultural: {
    dot: 'bg-orange-500',
    badge: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    hex: '#f97316',
  },
  training: {
    dot: 'bg-cyan-500',
    badge: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
    hex: '#06b6d4',
  },
  ceremony: {
    dot: 'bg-pink-500',
    badge: 'border-pink-500/40 bg-pink-500/10 text-pink-700 dark:text-pink-400',
    hex: '#ec4899',
  },
  celebration: {
    dot: 'bg-rose-500',
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
    hex: '#f43f5e',
  },
  conference: {
    dot: 'bg-blue-500',
    badge: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    hex: '#3b82f6',
  },
  other: {
    dot: 'bg-slate-500',
    badge: 'border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300',
    hex: '#64748b',
  },
};

function eventStyle(types: readonly string[]) {
  const primary = types[0] ?? 'other';
  return EVENT_TYPE_STYLE[primary] ?? EVENT_TYPE_STYLE.other!;
}

// ─── Prop types ─────────────────────────────────────────────────────

export interface DashboardProps {
  readonly isGlobalAdmin: boolean;
  readonly scopeLabel: string;
  readonly userName: string;
  readonly stats: GlobalStats | ScopedStats;
  readonly contributions: ContributionsBlock;
  readonly upcomingEvents: readonly EventItem[];
  readonly announcements: readonly AnnouncementItem[];
  readonly topMembers: readonly TopMember[];
  readonly calendarEvents: readonly CalendarEvent[];
  readonly chargesCompletion: readonly ChargeCompletion[];
  readonly latestTransactions: readonly Transaction[];
  readonly analytics: AnalyticsData;
}

export interface AnalyticsData {
  readonly membershipGrowth: readonly { readonly month: string; readonly members: number }[];
  readonly registrationPie: readonly { readonly name: string; readonly value: number }[];
  readonly contributionsTimeline: readonly {
    readonly month: string;
    readonly raised: number;
  }[];
  readonly chargesTimeline: readonly {
    readonly month: string;
    readonly expected: number;
    readonly paid: number;
  }[];
}

export interface GlobalStats {
  readonly kind: 'global';
  readonly branches: number;
  readonly chapters: number;
  readonly autonomousChapters: number;
  readonly totalMembers: number;
  readonly allMembers: number;
  readonly percentMembership: number;
  readonly upcomingEvents: number;
  readonly collectedByCurrency: readonly { readonly currency: string; readonly amount: number }[];
  readonly trends: {
    readonly totalMembers: number;
    readonly collected: number;
  };
}

export interface ScopedStats {
  readonly kind: 'scoped';
  readonly members: number;
  readonly percentCompletion: number;
  readonly upcomingEvents: number;
  readonly percentAcquisition: number | null;
  readonly newMembersThisMonth: number;
  readonly trends: {
    readonly members: number;
    readonly collected: number;
  };
}

export interface ContributionRow {
  readonly id: string;
  readonly name: string;
  readonly shape: string;
  readonly raised: number;
  readonly goal: number | null;
  readonly currency: string;
  readonly closeDate: string | null;
  readonly scopeName: string;
}

export interface ContributionsBlock {
  readonly total: number;
  readonly currency: string;
  readonly rows: readonly ContributionRow[];
}

export interface EventItem {
  readonly id: string;
  readonly name: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly venue: string | null;
  readonly scopeName: string;
  readonly types: readonly string[];
}

export interface AnnouncementItem {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly publishedAt: string | null;
  readonly scopeName: string;
}

export interface TopMember {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly city: string | null;
  readonly country: string | null;
  readonly scopeSlug: string | null;
}

export interface CalendarEvent {
  readonly id: string;
  readonly name: string;
  readonly startAt: string;
  readonly types: readonly string[];
}

export interface ChargeCompletion {
  readonly id: string;
  readonly name: string;
  readonly scopeName: string;
  readonly expected: number;
  readonly paid: number;
  readonly percent: number;
  readonly currency: string;
}

export interface Transaction {
  readonly id: string;
  readonly payer: string;
  readonly what: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly isReversal: boolean;
  readonly createdAt: string;
}

// ─── Root view ──────────────────────────────────────────────────────

export function ExcoDashboardView(props: DashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <Header
        userName={props.userName}
        scopeLabel={props.scopeLabel}
        isGlobalAdmin={props.isGlobalAdmin}
      />

      {props.stats.kind === 'global' ? (
        <GlobalStatsRow stats={props.stats} />
      ) : (
        <ScopedStatsRow stats={props.stats} />
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <MembershipGrowthCard data={props.analytics.membershipGrowth} />
        <ChargesTimelineCard data={props.analytics.chargesTimeline} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <ContributionsCard block={props.contributions} />
          <ChargesCompletionCard rows={props.chargesCompletion} />
          <LatestTransactionsCard rows={props.latestTransactions} />
        </div>

        <div className="flex flex-col gap-5">
          <UpcomingEventsCard events={props.upcomingEvents} />
          <CalendarCard events={props.calendarEvents} />
          <AnnouncementsCard items={props.announcements} />
          <RegistrationPieCard
            data={props.analytics.registrationPie}
            title={props.isGlobalAdmin ? 'Registration coverage' : 'Registration mix'}
            compact
          />
          <ContributionsTimelineCard data={props.analytics.contributionsTimeline} compact />
        </div>
      </div>

      <TopMembersCard members={props.topMembers} />
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────

function Header({
  userName,
  scopeLabel,
  isGlobalAdmin,
}: {
  readonly userName: string;
  readonly scopeLabel: string;
  readonly isGlobalAdmin: boolean;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 5
      ? 'Good night'
      : hour < 12
        ? 'Good morning'
        : hour < 18
          ? 'Good afternoon'
          : 'Good evening';

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {userName.split(' ')[0] ?? userName}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGlobalAdmin ? (
            <>Federation-wide view · {scopeLabel}</>
          ) : (
            <>Your workspace · {scopeLabel}</>
          )}
        </p>
      </div>
      <GradientPanel muted className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Current time
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {now.toLocaleString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <Clock className="h-6 w-6 text-primary" />
      </GradientPanel>
    </div>
  );
}

// ─── Stats ──────────────────────────────────────────────────────────

function GlobalStatsRow({ stats }: { readonly stats: GlobalStats }) {
  const collected = stats.collectedByCurrency;
  const primaryCurrency = collected[0] ?? { currency: '—', amount: 0 };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Branches & chapters"
        value={`${stats.branches} · ${stats.chapters}`}
        sub={
          <span>
            {stats.branches} branches, {stats.chapters} chapters
            {stats.autonomousChapters > 0 && ` (${stats.autonomousChapters} autonomous)`}
          </span>
        }
        icon={<Sparkles />}
      />
      <StatCard
        label="Total members"
        value={stats.totalMembers.toLocaleString()}
        sub={<span>In a branch or chapter</span>}
        icon={<Users />}
        trend={stats.trends.totalMembers}
      />
      <StatCard
        label="Membership rate"
        value={`${stats.percentMembership}%`}
        sub={<span>of {stats.allMembers.toLocaleString()} total identities</span>}
        icon={<TrendingUp />}
      />
      <StatCard
        label="Upcoming events"
        value={stats.upcomingEvents.toLocaleString()}
        sub={<span>Published & scheduled</span>}
        icon={<CalendarIcon />}
      />
      <StatCard
        label="Total collected"
        value={`${formatCompact(primaryCurrency.amount)} ${primaryCurrency.currency}`}
        sub={
          collected.length > 1 ? (
            <span>
              +{collected.length - 1} more currenc{collected.length > 2 ? 'ies' : 'y'}
            </span>
          ) : (
            <span>All-time payments (net)</span>
          )
        }
        icon={<Wallet />}
        trend={stats.trends.collected}
      />
    </div>
  );
}

function ScopedStatsRow({ stats }: { readonly stats: ScopedStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Members"
        value={stats.members.toLocaleString()}
        sub={<span>Active + passive at your scope</span>}
        icon={<Users />}
        trend={stats.trends.members}
      />
      <StatCard
        label="Charges completion"
        value={`${stats.percentCompletion}%`}
        sub={<span>Paid ÷ expected</span>}
        icon={<Target />}
      />
      <StatCard
        label="Upcoming events"
        value={stats.upcomingEvents.toLocaleString()}
        sub={<span>Published & scheduled</span>}
        icon={<CalendarIcon />}
      />
      <StatCard
        label="Acquisition"
        value={stats.percentAcquisition == null ? '—' : `${stats.percentAcquisition}%`}
        sub={<span>Of alumni in your city</span>}
        icon={<MapPin />}
      />
      <StatCard
        label="New this month"
        value={stats.newMembersThisMonth.toLocaleString()}
        sub={<span>Joined since day one</span>}
        icon={<Sparkles />}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: React.ReactNode;
  readonly icon?: React.ReactNode;
  /**
   * Percent change vs previous month. Positive = growth, negative =
   * decline, 0 = flat. Omit to hide the badge.
   */
  readonly trend?: number;
}) {
  // Strict 3-line layout: label row, value row, sub row. The value row
  // is `whitespace-nowrap` so long amounts scale down instead of wrapping
  // to a fourth line. Sub content is `truncate` for the same reason.
  return (
    <GradientPanel className="flex flex-col justify-between gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="truncate whitespace-nowrap text-2xl font-semibold text-foreground tabular-nums leading-none">
          {value}
        </span>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      {sub && (
        <div className="truncate text-[11px] text-muted-foreground [&_span]:truncate">{sub}</div>
      )}
    </GradientPanel>
  );
}

function TrendBadge({ value }: { readonly value: number }) {
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const styles: Record<string, string> = {
    up: 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-400',
    down: 'text-destructive bg-destructive/10',
    flat: 'text-muted-foreground bg-muted/40',
  };
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  const label = dir === 'flat' ? '±0%' : `${dir === 'up' ? '+' : ''}${value}%`;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${styles[dir]}`}
      title="vs last month"
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ─── Contributions ──────────────────────────────────────────────────

function ContributionsCard({ block }: { readonly block: ContributionsBlock }) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Contributions
          </h2>
          <p className="text-xs text-muted-foreground">Live goals + open drives</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Total raised
          </div>
          <div className="text-lg font-semibold text-foreground tabular-nums">
            {new Intl.NumberFormat().format(Math.round(block.total))} {block.currency}
          </div>
        </div>
      </div>

      {block.rows.length === 0 ? (
        <EmptyBlock label="No active contributions at your scope right now." />
      ) : (
        <ul className="flex flex-col gap-3">
          {block.rows.map((r) => (
            <li key={r.id}>
              <ContributionRowView row={r} />
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}

function ContributionRowView({ row }: { readonly row: ContributionRow }) {
  const pct =
    row.goal && row.goal > 0 ? Math.min(100, Math.round((row.raised / row.goal) * 100)) : null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-foreground">{row.name}</span>
          <span className="text-[11px] text-muted-foreground">
            {row.scopeName} · {row.shape}
          </span>
        </div>
        <span className="text-sm font-medium text-foreground tabular-nums">
          {new Intl.NumberFormat().format(Math.round(row.raised))}
          {row.goal && (
            <span className="text-muted-foreground">
              {' '}
              / {new Intl.NumberFormat().format(row.goal)}
            </span>
          )}{' '}
          <span className="text-xs text-muted-foreground">{row.currency}</span>
        </span>
      </div>
      {pct !== null ? (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">{pct}% of goal</span>
        </>
      ) : (
        <span className="text-[11px] text-muted-foreground">Open drive · no fixed goal</span>
      )}
    </div>
  );
}

// ─── Charges completion ────────────────────────────────────────────

function ChargesCompletionCard({ rows }: { readonly rows: readonly ChargeCompletion[] }) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BadgeDollarSign className="h-4 w-4 text-primary" />
            Charges completion
          </h2>
          <p className="text-xs text-muted-foreground">Where dues and levies stand this cycle</p>
        </div>
        <Link
          href="/exco/finance-view/charges"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyBlock label="No active per-member charges to track." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                  <span className="text-[11px] text-muted-foreground">{r.scopeName}</span>
                </div>
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {r.percent}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    r.percent >= 80
                      ? 'bg-emerald-500'
                      : r.percent >= 40
                        ? 'bg-primary'
                        : 'bg-amber-500'
                  }`}
                  style={{ width: `${r.percent}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {new Intl.NumberFormat().format(Math.round(r.paid))} /{' '}
                {new Intl.NumberFormat().format(Math.round(r.expected))} {r.currency}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}

// ─── Latest transactions ───────────────────────────────────────────

function LatestTransactionsCard({ rows }: { readonly rows: readonly Transaction[] }) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            Latest transactions
          </h2>
          <p className="text-xs text-muted-foreground">Most recent payments in your reach</p>
        </div>
        <Link href="/finance/payments" className="text-xs font-medium text-primary hover:underline">
          Open ledger →
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyBlock label="No payments recorded yet." />
      ) : (
        <ul className="divide-y divide-border/40">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  t.isReversal
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {t.isReversal ? (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-foreground">{t.payer}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {t.what} · {formatMethod(t.method)}
                </span>
              </div>
              <div className="text-right leading-tight">
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    t.isReversal ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
                  }`}
                >
                  {t.isReversal ? '−' : ''}
                  {new Intl.NumberFormat().format(t.amount)} {t.currency}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatRelative(t.createdAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}

// ─── Upcoming events ───────────────────────────────────────────────

function UpcomingEventsCard({ events }: { readonly events: readonly EventItem[] }) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Upcoming events
          </h2>
          <p className="text-xs text-muted-foreground">Next five on the calendar</p>
        </div>
        <Link href="/exco/events" className="text-xs font-medium text-primary hover:underline">
          View all →
        </Link>
      </div>
      {events.length === 0 ? (
        <EmptyBlock label="No upcoming events." />
      ) : (
        <ul className="divide-y divide-border/40">
          {events.map((e) => {
            const style = eventStyle(e.types);
            return (
              <li
                key={e.id}
                className="flex gap-3 py-2 pl-2"
                style={{ borderLeftColor: style.hex, borderLeftWidth: 3 }}
              >
                <DateTile iso={e.startAt} bgClass={style.badge} />
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">{e.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {e.venue ?? '—'} · {e.scopeName}
                  </span>
                  {e.types.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.types.slice(0, 3).map((t) => {
                        const ts = EVENT_TYPE_STYLE[t] ?? EVENT_TYPE_STYLE.other!;
                        return (
                          <Badge
                            key={t}
                            variant="outline"
                            className={`text-[10px] capitalize ${ts.badge}`}
                          >
                            {t.replace('_', ' ')}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GradientPanel>
  );
}

function DateTile({ iso, bgClass }: { readonly iso: string; readonly bgClass?: string }) {
  const d = new Date(iso);
  return (
    <div
      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-border/60 ${
        bgClass ?? 'bg-primary/10 text-primary'
      }`}
    >
      <span className="text-[9px] font-medium uppercase tracking-wider">
        {d.toLocaleString(undefined, { month: 'short' })}
      </span>
      <span className="text-base font-semibold leading-none tabular-nums">
        {d.getDate().toString().padStart(2, '0')}
      </span>
    </div>
  );
}

// ─── Announcements ────────────────────────────────────────────────

function AnnouncementsCard({ items }: { readonly items: readonly AnnouncementItem[] }) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Bell className="h-4 w-4 text-primary" />
            Active announcements
          </h2>
          <p className="text-xs text-muted-foreground">Recently published across your scope</p>
        </div>
        <Link
          href="/exco/announcements"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyBlock label="Nothing published lately." />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((a) => (
            <li key={a.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{a.title}</span>
                {a.publishedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelative(a.publishedAt)}
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
              <span className="mt-1 block text-[10px] text-muted-foreground">{a.scopeName}</span>
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────

function CalendarCard({ events }: { readonly events: readonly CalendarEvent[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const monthLabel = useMemo(
    () =>
      new Date(cursor.year, cursor.month, 1).toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [cursor],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const e of events) {
      const d = new Date(e.startAt);
      if (d.getFullYear() !== cursor.year || d.getMonth() !== cursor.month) continue;
      const bucket = map.get(d.getDate()) ?? [];
      bucket.push(e);
      map.set(d.getDate(), bucket);
    }
    return map;
  }, [events, cursor]);

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay(); // 0..6 (Sun..Sat)

  const cells: Array<{ day: number | null; events: CalendarEvent[] }> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ day: null, events: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, events: eventsByDay.get(d) ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, events: [] });

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === cursor.year && today.getMonth() === cursor.month;

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Calendar
          </h2>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const isToday = isCurrentMonth && cell.day === today.getDate();
          const primaryEvent = cell.events[0];
          const primaryStyle = primaryEvent ? eventStyle(primaryEvent.types) : null;
          // Cell background gets tinted by the primary event's color so a
          // day with a sports event reads emerald, a day with a fundraiser
          // reads amber, etc. Multiple events → we show up to 3 colored
          // dots at the bottom, one per event, so mixed days are still
          // legible.
          return (
            <div
              key={i}
              className={`relative aspect-square rounded-md p-1 text-[11px] transition-colors ${
                cell.day ? 'hover:brightness-110' : ''
              } ${isToday ? 'ring-1 ring-primary' : ''}`}
              style={{
                backgroundColor: primaryStyle
                  ? `${primaryStyle.hex}22`
                  : cell.day
                    ? undefined
                    : undefined,
              }}
              title={cell.events.map((e) => e.name).join(', ')}
            >
              {cell.day && !primaryStyle && (
                <div className="absolute inset-0 rounded-md bg-background/40" aria-hidden />
              )}
              {cell.day && (
                <>
                  <span
                    className={`relative tabular-nums ${
                      isToday
                        ? 'font-semibold text-primary'
                        : primaryStyle
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.events.length > 0 && (
                    <div className="absolute inset-x-1 bottom-1 flex flex-wrap gap-0.5">
                      {cell.events.slice(0, 3).map((e) => {
                        const s = eventStyle(e.types);
                        return (
                          <span
                            key={e.id}
                            className={`h-1 w-1 rounded-full ${s.dot}`}
                            aria-hidden
                          />
                        );
                      })}
                      {cell.events.length > 3 && (
                        <span className="text-[9px] text-foreground">+</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact legend */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {Array.from(new Set(events.flatMap((e) => e.types)))
          .slice(0, 6)
          .map((t) => {
            const s = EVENT_TYPE_STYLE[t] ?? EVENT_TYPE_STYLE.other!;
            return (
              <span key={t} className="inline-flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {t.replace('_', ' ')}
              </span>
            );
          })}
      </div>
    </GradientPanel>
  );
}

// ─── Top members ──────────────────────────────────────────────────

function TopMembersCard({ members }: { readonly members: readonly TopMember[] }) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Crown className="h-4 w-4 text-primary" />
            Top members by engagement
          </h2>
          <p className="text-xs text-muted-foreground">
            Committed &gt; Engaged &gt; Normal &gt; Dormant, weighted across memberships
          </p>
        </div>
      </div>
      {members.length === 0 ? (
        <EmptyBlock label="No engagement data yet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, i) => (
            <TopMemberCard key={m.id} member={m} rank={i + 1} />
          ))}
        </div>
      )}
    </GradientPanel>
  );
}

function TopMemberCard({ member, rank }: { readonly member: TopMember; readonly rank: number }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-background/70">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {rank}
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{member.name}</span>
        <span className="truncate text-[11px] text-muted-foreground">
          {[member.city, member.country].filter(Boolean).join(', ') || 'Location unknown'}
        </span>
        <span className="text-[10px] font-medium tabular-nums text-primary">
          score {member.score}
        </span>
      </div>
    </div>
  );

  if (!member.scopeSlug) return inner;
  return (
    <Link href={`/exco/memberships/members/${member.scopeSlug}/${member.id}`} className="block">
      {inner}
    </Link>
  );
}

// ─── Chart cards ──────────────────────────────────────────────────

const CHART_PRIMARY = '#c53030'; // theme primary — Shesa red
const CHART_SECONDARY = '#3b82f6'; // blue — used for the "expected" bar
const CHART_MUTED = '#94a3b8'; // slate — used for "unregistered"

function MembershipGrowthCard({
  data,
}: {
  readonly data: readonly { readonly month: string; readonly members: number }[];
}) {
  const growth = useMemo(() => {
    if (data.length < 2) return 0;
    const first = data[0]!.members;
    const last = data[data.length - 1]!.members;
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 100);
  }, [data]);

  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Membership growth
          </h2>
          <p className="text-xs text-muted-foreground">Cumulative geographic memberships</p>
        </div>
        <TrendBadge value={growth} />
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[...data]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="var(--color-muted-foreground)"
              allowDecimals={false}
            />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
            <Area
              type="monotone"
              dataKey="members"
              stroke={CHART_PRIMARY}
              strokeWidth={2}
              fill="url(#growthGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GradientPanel>
  );
}

function RegistrationPieCard({
  data,
  title,
  compact = false,
}: {
  readonly data: readonly { readonly name: string; readonly value: number }[];
  readonly title: string;
  readonly compact?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const registered = data.find((d) => d.name === 'Registered')?.value ?? 0;
  const pct = total > 0 ? Math.round((registered / total) * 100) : 0;
  const colors = [CHART_PRIMARY, CHART_MUTED];

  return (
    <GradientPanel className={`flex flex-col gap-3 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            {title}
          </h2>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Members with vs. without an active geographic membership
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Coverage
          </div>
          <div className="text-lg font-semibold text-foreground tabular-nums">{pct}%</div>
        </div>
      </div>
      <div className={compact ? 'h-40 w-full' : 'h-52 w-full'}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[...data]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={compact ? 34 : 45}
              outerRadius={compact ? 56 : 72}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GradientPanel>
  );
}

function ContributionsTimelineCard({
  data,
  compact = false,
}: {
  readonly data: readonly { readonly month: string; readonly raised: number }[];
  readonly compact?: boolean;
}) {
  // Compact variant only shows the last 6 months so it fits the sidebar
  // column comfortably. Total is still summed across whatever we chart.
  const shown = compact ? data.slice(-6) : data;
  const total = shown.reduce((s, d) => s + d.raised, 0);
  const windowLabel = compact ? '6-month total' : '12-month total';
  return (
    <GradientPanel className={`flex flex-col gap-3 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Contributions timeline
          </h2>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Raised across goal / open / ticketed shapes
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {windowLabel}
          </div>
          <div className="text-lg font-semibold text-foreground tabular-nums">
            {formatCompact(total)}
          </div>
        </div>
      </div>
      <div className={compact ? 'h-36 w-full' : 'h-52 w-full'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...shown]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: compact ? 10 : 11 }}
              stroke="var(--color-muted-foreground)"
            />
            <YAxis
              tick={{ fontSize: compact ? 10 : 11 }}
              stroke="var(--color-muted-foreground)"
              tickFormatter={(v) => formatCompact(Number(v))}
              width={compact ? 34 : 40}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => new Intl.NumberFormat().format(Number(v))}
            />
            <Bar dataKey="raised" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GradientPanel>
  );
}

function ChargesTimelineCard({
  data,
}: {
  readonly data: readonly {
    readonly month: string;
    readonly expected: number;
    readonly paid: number;
  }[];
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BadgeDollarSign className="h-4 w-4 text-primary" />
            Charges: expected vs paid
          </h2>
          <p className="text-xs text-muted-foreground">Per-period obligations landing each month</p>
        </div>
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...data]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="var(--color-muted-foreground)"
              tickFormatter={(v) => formatCompact(Number(v))}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => new Intl.NumberFormat().format(Number(v))}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="expected" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} name="Expected" />
            <Bar dataKey="paid" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Paid" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GradientPanel>
  );
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
};

const tooltipLabelStyle: React.CSSProperties = {
  color: 'var(--color-muted-foreground)',
  fontSize: 11,
  fontWeight: 500,
};

// ─── Helpers ──────────────────────────────────────────────────────

function EmptyBlock({ label }: { readonly label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

/**
 * Compact number formatter — `10333000 → "10.3M"`, `59453 → "59.4K"`,
 * `800 → "800"`. Keeps card values on a single line so the strict
 * 3-line layout survives large amounts.
 */
function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
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
      return 'Bank';
    case 'card':
      return 'Card';
    default:
      return method;
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.round((now - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
