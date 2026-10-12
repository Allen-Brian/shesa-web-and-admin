import type { MatrixMember, MatrixPeriod } from './charge-detail-types';

/**
 * Per-year rollup of paid + owed with a nested per-month map. Feeds
 * every card on the yearly analysis panel: YTD KPIs, yearly totals
 * bar, seasonal line, monthly heatmap.
 */
export interface YearStats {
  readonly year: number;
  readonly paid: number;
  readonly owed: number;
  readonly coverage: number;
  readonly months: ReadonlyMap<number, { paid: number; owed: number }>;
}

export function buildYearlyStats(
  periods: readonly MatrixPeriod[],
  members: readonly MatrixMember[],
): YearStats[] {
  const perYear = new Map<
    number,
    {
      paid: number;
      owed: number;
      months: Map<number, { paid: number; owed: number }>;
    }
  >();
  periods.forEach((p, originalIdx) => {
    if (p.isUpcoming || !p.periodStart) return;
    const d = new Date(p.periodStart);
    if (Number.isNaN(d.getTime())) return;
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    let paidPeriod = 0;
    let owedPeriod = 0;
    for (const m of members) {
      const c = m.cells[originalIdx];
      if (!c) continue;
      paidPeriod += c.paid;
      owedPeriod += c.owed;
    }
    const yEntry = perYear.get(year) ?? { paid: 0, owed: 0, months: new Map() };
    yEntry.paid += paidPeriod;
    yEntry.owed += owedPeriod;
    const cur = yEntry.months.get(month) ?? { paid: 0, owed: 0 };
    cur.paid += paidPeriod;
    cur.owed += owedPeriod;
    yEntry.months.set(month, cur);
    perYear.set(year, yEntry);
  });
  return Array.from(perYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, s]) => ({
      year,
      paid: s.paid,
      owed: s.owed,
      coverage: s.owed > 0 ? Math.round((s.paid / s.owed) * 100) : 0,
      months: s.months,
    }));
}

/** Two-or-more distinct months present → yearly rollups are meaningful. */
export function hasYearlyRollupData(periods: readonly MatrixPeriod[]): boolean {
  const distinctMonths = new Set<string>();
  periods.forEach((p) => {
    if (p.isUpcoming || !p.periodStart) return;
    distinctMonths.add(p.periodStart.slice(0, 7));
  });
  return distinctMonths.size >= 2;
}

/**
 * YTD vs prior-YTD (through the same calendar month) — used for the
 * "YoY delta" KPI. `delta` is null when the prior year has no
 * comparable payments (avoid dividing by zero).
 */
export interface YtdComparison {
  readonly cur: { paid: number; owed: number };
  readonly prev: { paid: number; owed: number };
  readonly delta: number | null;
}

export function computeYtd(
  stats: readonly YearStats[],
  currentYear: number,
  currentMonth: number,
): YtdComparison {
  const sumThrough = (year: YearStats | undefined) => {
    if (!year) return { paid: 0, owed: 0 };
    let paid = 0;
    let owed = 0;
    for (const [m, v] of year.months) {
      if (m > currentMonth) continue;
      paid += v.paid;
      owed += v.owed;
    }
    return { paid, owed };
  };
  const thisYear = stats.find((y) => y.year === currentYear);
  const priorYear = stats.find((y) => y.year === currentYear - 1);
  const cur = sumThrough(thisYear);
  const prev = sumThrough(priorYear);
  const delta = prev.paid > 0 ? Math.round(((cur.paid - prev.paid) / prev.paid) * 100) : null;
  return { cur, prev, delta };
}

/**
 * Seasonal coverage — average coverage per calendar month across
 * every year in the dataset. Feeds the seasonal-line chart card.
 */
export function buildSeasonalLine(
  stats: readonly YearStats[],
  monthShort: (m: number) => string,
): { label: string; coverage: number; samples: number }[] {
  const bins = Array.from({ length: 12 }, (_, m) => ({
    month: m,
    totalPaid: 0,
    totalOwed: 0,
    samples: 0,
  }));
  for (const y of stats) {
    for (const [m, v] of y.months) {
      const bin = bins[m];
      if (!bin) continue;
      bin.totalPaid += v.paid;
      bin.totalOwed += v.owed;
      bin.samples += 1;
    }
  }
  return bins.map((b) => ({
    label: monthShort(b.month),
    coverage: b.totalOwed > 0 ? Math.round((b.totalPaid / b.totalOwed) * 100) : 0,
    samples: b.samples,
  }));
}
