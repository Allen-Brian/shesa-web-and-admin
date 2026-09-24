'use client';

import { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Lightbulb,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';

import { GradientPanel, Private } from '@shesa/ui';

import { ExportButton } from '@/components/export-button';
import { formatCompactMoney, formatMoney } from '@/lib/finance/format-money';

import {
  ChartCard,
  CumulativeCurve,
  DailyBars,
  EmptyChart,
  RankedBars,
  SharePie,
} from './group-report-charts';
import { buildGroupReportExport } from './group-report-export';
import { computeGroupInsights } from './group-report-stats';
import type { GroupReportData } from './group-report-types';

/**
 * An event group's report dashboard.
 *
 * The layout follows the order a committee actually asks things in,
 * top to bottom: how did we do, how did it build up, what brought the
 * money, how did people pay, where did it go, who gave the most. Each
 * panel says in a subtitle what it is for, because the people reading
 * this are event organisers rather than treasurers, and a chart with
 * only a title makes them guess.
 *
 * Everything below the summary reduces the same two arrays of rows, so
 * no panel can disagree with another about what the total was.
 */
export function GroupReportsView({ data }: { readonly data: GroupReportData }) {
  const s = useMemo(() => computeGroupInsights(data), [data]);
  const { currency } = data;
  const money = (v: number) => formatMoney(v, currency);

  const hasActivity = s.paymentCount > 0 || s.expenses !== 0;

  if (!hasActivity) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground/60" />
        <h2 className="text-lg font-semibold text-foreground">Nothing has happened yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          No money has come in or gone out under <span className="font-medium">{data.name}</span> so
          far. As soon as the first payment or expense is recorded against one of this group&apos;s
          charges, the full picture will build itself here.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            How {data.name} is doing
          </h2>
          <p className="text-base text-muted-foreground">
            Everything recorded against this group, {periodLabel(data)}.
          </p>
        </div>
        <ExportButton
          spec={() => buildGroupReportExport(data, s)}
          label="Export report"
          disabled={!hasActivity}
        />
      </header>

      <Narrative data={data} insights={s} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={ArrowUpRight}
          tone="emerald"
          label="Money in"
          value={formatCompactMoney(s.income, currency)}
          hint={`${s.paymentCount.toLocaleString()} payment${s.paymentCount === 1 ? '' : 's'} from ${s.payerCount.toLocaleString()} ${s.payerCount === 1 ? 'person' : 'people'}`}
        />
        <Kpi
          icon={ArrowDownRight}
          tone="amber"
          label="Money out"
          value={formatCompactMoney(s.expenses, currency)}
          hint={
            s.byCategory.length > 0
              ? `Mostly ${s.byCategory[0]!.name.toLowerCase()}`
              : 'Nothing spent yet'
          }
        />
        <Kpi
          icon={Wallet}
          tone={s.net >= 0 ? 'primary' : 'rose'}
          label={s.net >= 0 ? 'Left over' : 'Short by'}
          value={formatCompactMoney(Math.abs(s.net), currency)}
          hint={
            s.net >= 0
              ? 'What remains after everything spent'
              : 'More has gone out than has come in'
          }
        />
        <Kpi
          icon={ShieldCheck}
          tone={s.reconciledShare >= 0.9 ? 'emerald' : 'slate'}
          label="Checked against the gateway"
          value={`${Math.round(s.reconciledShare * 100)}%`}
          hint={`${money(s.reconciledAmount)} of money in has been matched`}
        />
      </div>

      <ChartCard
        title="How the money built up"
        subtitle="The green area is everything raised so far, adding up day by day. The blue line is what is actually left once spending is taken off — when the two drift apart, money is going out as fast as it comes in."
      >
        <CumulativeCurve series={s.series} currency={currency} />
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Day by day"
          subtitle="Which days were busy. Tall green days are usually a deadline, an announcement or an event date — worth knowing before planning the next one."
        >
          <DailyBars series={s.series} currency={currency} />
        </ChartCard>

        <ChartCard
          title="What brought the money in"
          subtitle="Each charge in this group, ranked by what it collected. The biggest bar is what this group really runs on."
        >
          <RankedBars
            data={s.byCharge.map((c) => ({ name: c.name, value: c.collected, count: c.payers }))}
            currency={currency}
            fill="#10b981"
            emptyMessage="No charge in this group has collected anything yet."
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="How people paid"
          subtitle="The share of money arriving by each method. A large cash slice is money somebody had to carry and count."
        >
          <SharePie
            data={s.byMethod}
            currency={currency}
            emptyMessage="No payments recorded yet."
          />
        </ChartCard>

        <ChartCard
          title="Website or by hand"
          subtitle="Money paid online through the site, against money an officer keyed in afterwards. The hand-entered share is the work the website is not yet saving anyone."
        >
          <SharePie
            data={s.byChannel}
            currency={currency}
            emptyMessage="No payments recorded yet."
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Where the money went"
          subtitle="Spending grouped by category. Only expenses that have been recorded or approved are counted — anything still waiting for approval is left out."
        >
          <RankedBars
            data={s.byCategory}
            currency={currency}
            fill="#f59e0b"
            emptyMessage="Nothing has been spent under this group yet."
          />
        </ChartCard>

        <ChartCard
          title="Who gave the most"
          subtitle="The ten largest contributors by total amount. Anonymous givers are left out — they cannot be thanked by name."
        >
          {s.topPayers.length === 0 ? (
            <EmptyChart message="No named contributors yet." />
          ) : (
            /* A plain divided list. These were cards sitting inside a
               card, which drew a border around every name and made ten
               contributors read as ten separate panels rather than one
               ranking. */
            <ol className="divide-y divide-border">
              {s.topPayers.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <Private className="min-w-0 flex-1">
                    <span className="block truncate text-base text-foreground" title={p.name}>
                      {p.name}
                    </span>
                  </Private>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {p.payments} payment{p.payments === 1 ? '' : 's'}
                  </span>
                  <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">
                    {formatCompactMoney(p.total, currency)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </ChartCard>
      </div>

      {s.byCharge.some((c) => c.coverage !== null) && (
        <ChartCard
          title="How close each charge is to its target"
          subtitle="Only charges that raise obligations have a target to measure against. The bar shows how much of what was owed has actually been paid."
        >
          <div className="flex flex-col gap-3">
            {s.byCharge
              .filter((c) => c.coverage !== null)
              .map((c) => (
                <div key={c.name} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-base font-medium text-foreground">{c.name}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {money(c.collected)} of {money(c.expected)} ·{' '}
                      <span
                        className={
                          c.coverage! >= 1
                            ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                            : 'font-semibold text-foreground'
                        }
                      >
                        {Math.round(c.coverage! * 100)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        c.coverage! >= 1 ? 'bg-emerald-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, c.coverage! * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </ChartCard>
      )}

      <p className="text-sm text-muted-foreground">
        Every figure here also appears in the mainstream ledger — a group is a lens on the books,
        not a separate set of them.
      </p>
    </section>
  );
}

/** `'between 1 Mar and 14 Mar 2026'`, or a fallback when undated. */
function periodLabel(data: GroupReportData): string {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' });
  if (data.startsOn && data.endsOn) return `${fmt(data.startsOn)} – ${fmt(data.endsOn)}`;
  if (data.startsOn) return `from ${fmt(data.startsOn)}`;
  if (data.endsOn) return `up to ${fmt(data.endsOn)}`;
  return 'across its whole life';
}

/**
 * The dashboard said in sentences, above the charts rather than below
 * them. Same reasoning as the mainstream Reports page: the people who
 * open a group's report are usually organising the event, not keeping
 * its books, and a paragraph gets them to the point faster than eight
 * panels do.
 */
function Narrative({
  data,
  insights,
}: {
  readonly data: GroupReportData;
  readonly insights: ReturnType<typeof computeGroupInsights>;
}) {
  const s = insights;
  const money = (v: number) => formatMoney(v, data.currency);
  const lines: string[] = [];

  lines.push(
    `${data.name} has taken in ${money(s.income)} from ${s.paymentCount.toLocaleString()} payment${s.paymentCount === 1 ? '' : 's'} across ${s.daysActive.toLocaleString()} day${s.daysActive === 1 ? '' : 's'} of activity.`,
  );

  if (s.expenses > 0) {
    lines.push(
      s.net >= 0
        ? `${money(s.expenses)} has been spent, leaving ${money(s.net)}.`
        : `${money(s.expenses)} has been spent, which is ${money(Math.abs(s.net))} more than has come in.`,
    );
  } else {
    lines.push('Nothing has been spent against it yet.');
  }

  const topCharge = s.byCharge[0];
  if (topCharge && s.income > 0 && topCharge.collected > 0) {
    lines.push(
      `Most of that came through ${topCharge.name} — ${money(topCharge.collected)}, about ${Math.round((topCharge.collected / s.income) * 100)}% of everything raised.`,
    );
  }

  const topMethod = s.byMethod[0];
  if (topMethod && s.income > 0) {
    lines.push(
      `${topMethod.name} is how most people paid, carrying ${Math.round((topMethod.value / s.income) * 100)}% of it.`,
    );
  }

  if (s.busiestDay && s.daysActive > 1) {
    lines.push(
      `The single busiest day was ${new Date(`${s.busiestDay.date}T00:00:00`).toLocaleDateString('en-GB', { dateStyle: 'medium' })}, when ${money(s.busiestDay.income)} came in.`,
    );
  }

  if (s.reconciledShare < 0.9 && s.income > 0) {
    lines.push(
      `${Math.round((1 - s.reconciledShare) * 100)}% of the money in has not yet been checked against the gateway — worth clearing before this group is closed.`,
    );
  }

  return (
    <GradientPanel className="p-4">
      <div className="flex gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary">
            In plain words
          </h3>
          <p className="text-base leading-relaxed text-foreground">{lines.join(' ')}</p>
        </div>
      </div>
    </GradientPanel>
  );
}

type KpiTone = 'emerald' | 'amber' | 'primary' | 'rose' | 'slate';

const KPI_TONES: Record<KpiTone, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  primary: 'bg-primary/10 text-primary',
  rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  slate: 'bg-muted text-muted-foreground',
};

/**
 * A KPI tile with a hint line. The shared `StatsCard` carries only a
 * label and a figure, and a figure alone invites the wrong reading —
 * "94%" means nothing until it says 94% of what.
 */
function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  readonly icon: typeof Users;
  readonly tone: KpiTone;
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}) {
  return (
    <GradientPanel className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${KPI_TONES[tone]}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
    </GradientPanel>
  );
}
