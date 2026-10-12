import { formatPaymentMethod } from '@/lib/format/payment-method';

import type {
  ChargePerformance,
  DayPoint,
  GroupExpenseRow,
  GroupInsights,
  GroupPaymentRow,
  GroupReportData,
  NamedValue,
  TopPayer,
} from './group-report-types';

/**
 * Every figure on the group dashboard, computed in one pass per
 * question.
 *
 * Two rules run through all of it.
 *
 * A reversal is negative money, not a row to skip. Filtering reversals
 * out would overstate income by exactly the amount that was handed
 * back, which is the error most likely to be repeated in a committee
 * report and least likely to be spotted.
 *
 * An expense only counts once it is `recorded` or `approved`. A
 * pending-approval expense is a request, and a dashboard that spends
 * money before anyone has agreed to it will show a net that no bank
 * balance matches.
 */

const COUNTED_EXPENSE_STATUSES = new Set(['recorded', 'approved']);

/** Signed contribution of a payment to income. */
function signedAmount(row: { amount: number; isReversal: boolean }): number {
  return row.isReversal ? -row.amount : row.amount;
}

function countsTowardSpend(expense: GroupExpenseRow): boolean {
  return COUNTED_EXPENSE_STATUSES.has(expense.status);
}

export function computeGroupInsights(data: GroupReportData): GroupInsights {
  const { payments, expenses, charges } = data;

  const countedExpenses = expenses.filter(countsTowardSpend);

  const income = payments.reduce((a, p) => a + signedAmount(p), 0);
  const spend = countedExpenses.reduce((a, e) => a + signedAmount(e), 0);

  // Reconciliation is measured in money rather than in rows: fifty
  // small matched payments and one large unmatched one is not a
  // well-reconciled ledger, and a row-count share would say it was.
  const reconciledAmount = payments
    .filter((p) => p.reconciled && !p.isReversal)
    .reduce((a, p) => a + p.amount, 0);
  const grossIn = payments.filter((p) => !p.isReversal).reduce((a, p) => a + p.amount, 0);

  const series = buildSeries(payments, countedExpenses);
  const expected = charges.reduce((a, c) => a + c.expected, 0);

  const payerTotals = groupPayers(payments);
  const realPayments = payments.filter((p) => !p.isReversal).length;

  return {
    income,
    expenses: spend,
    net: income - spend,
    paymentCount: realPayments,
    payerCount: payerTotals.length,
    averageGift: realPayments > 0 ? income / realPayments : 0,
    reconciledAmount,
    reconciledShare: grossIn > 0 ? reconciledAmount / grossIn : 0,
    expected,
    coverage: expected > 0 ? income / expected : null,
    busiestDay: series.reduce<DayPoint | null>(
      (best, d) => (best === null || d.income > best.income ? d : best),
      null,
    ),
    daysActive: series.length,
    series,
    byCharge: buildChargePerformance(data),
    byMethod: buildByMethod(payments),
    byChannel: buildByChannel(payments),
    byCategory: buildByCategory(countedExpenses),
    topPayers: payerTotals.slice(0, 10),
  };
}

/**
 * Day-by-day income and spend, plus the running totals.
 *
 * Only days that saw activity become points. Filling the gaps would
 * make a two-week event with three busy days look like a flat line
 * with three spikes, and on the cumulative curve — the one that
 * actually gets read — it changes nothing.
 */
function buildSeries(
  payments: readonly GroupPaymentRow[],
  expenses: readonly GroupExpenseRow[],
): DayPoint[] {
  const byDay = new Map<string, { income: number; expense: number }>();

  const bump = (iso: string, key: 'income' | 'expense', value: number) => {
    const day = iso.slice(0, 10);
    const entry = byDay.get(day) ?? { income: 0, expense: 0 };
    entry[key] += value;
    byDay.set(day, entry);
  };

  for (const p of payments) bump(p.createdAt, 'income', signedAmount(p));
  for (const e of expenses) bump(e.incurredAt, 'expense', signedAmount(e));

  let cumulativeIncome = 0;
  let cumulativeNet = 0;
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => {
      cumulativeIncome += v.income;
      cumulativeNet += v.income - v.expense;
      return {
        date,
        income: v.income,
        expense: v.expense,
        cumulativeIncome,
        cumulativeNet,
      };
    });
}

/**
 * What each charge in the group actually brought in, against what it
 * was meant to.
 *
 * Charges with no money and no obligations are dropped — a group
 * usually carries a couple of drafts that were never activated, and a
 * row of zeroes for them buries the charges that did something.
 */
function buildChargePerformance(data: GroupReportData): ChargePerformance[] {
  const collected = new Map<string, { total: number; payers: Set<string> }>();
  for (const p of data.payments) {
    if (!p.chargeId) continue;
    const entry = collected.get(p.chargeId) ?? { total: 0, payers: new Set<string>() };
    entry.total += signedAmount(p);
    if (!p.isReversal) entry.payers.add(p.payerLabel);
    collected.set(p.chargeId, entry);
  }

  return data.charges
    .map((c) => {
      const hit = collected.get(c.id);
      const total = hit?.total ?? 0;
      return {
        name: c.name,
        shape: c.shape,
        collected: total,
        expected: c.expected,
        payers: hit?.payers.size ?? 0,
        coverage: c.expected > 0 ? total / c.expected : null,
      };
    })
    .filter((c) => c.collected !== 0 || c.expected > 0)
    .sort((a, b) => b.collected - a.collected);
}

function buildByMethod(payments: readonly GroupPaymentRow[]): NamedValue[] {
  return rollUp(payments, (p) => formatPaymentMethod(p.method));
}

function buildByChannel(payments: readonly GroupPaymentRow[]): NamedValue[] {
  return rollUp(payments, (p) => (p.source === 'auto' ? 'Paid on the website' : 'Entered by hand'));
}

function buildByCategory(expenses: readonly GroupExpenseRow[]): NamedValue[] {
  const byName = new Map<string, { value: number; count: number }>();
  for (const e of expenses) {
    const entry = byName.get(e.categoryName) ?? { value: 0, count: 0 };
    entry.value += signedAmount(e);
    if (!e.isReversal) entry.count += 1;
    byName.set(e.categoryName, entry);
  }
  return Array.from(byName.entries())
    .map(([name, v]) => ({ name, value: v.value, count: v.count }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

function rollUp(
  payments: readonly GroupPaymentRow[],
  key: (p: GroupPaymentRow) => string,
): NamedValue[] {
  const byKey = new Map<string, { value: number; count: number }>();
  for (const p of payments) {
    const k = key(p);
    const entry = byKey.get(k) ?? { value: 0, count: 0 };
    entry.value += signedAmount(p);
    if (!p.isReversal) entry.count += 1;
    byKey.set(k, entry);
  }
  return Array.from(byKey.entries())
    .map(([name, v]) => ({ name, value: v.value, count: v.count }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

/**
 * Who paid, most generous first.
 *
 * Anonymous payers are collapsed under one label upstream, so they can
 * pile into a single misleading "top contributor" row. They are
 * dropped here rather than shown: this panel exists to be read out or
 * thanked from, and "Anonymous donor — 400,000" is neither.
 */
function groupPayers(payments: readonly GroupPaymentRow[]): TopPayer[] {
  const byName = new Map<string, { total: number; payments: number; isMember: boolean }>();
  for (const p of payments) {
    const entry = byName.get(p.payerLabel) ?? { total: 0, payments: 0, isMember: p.isMember };
    entry.total += signedAmount(p);
    if (!p.isReversal) entry.payments += 1;
    byName.set(p.payerLabel, entry);
  }
  return Array.from(byName.entries())
    .filter(([name]) => name !== '—' && !name.toLowerCase().startsWith('anonymous'))
    .map(([name, v]) => ({ name, total: v.total, payments: v.payments, isMember: v.isMember }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
}
