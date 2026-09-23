'use client';

import { Lightbulb } from 'lucide-react';

import { formatMoney } from '@/lib/finance/format-money';

import type {
  ArrearsRow,
  CollectionsRow,
  DonationReportRow,
  ExpenseByCategoryRow,
  PaymentMethodRow,
  TreasuryStatementRow,
} from '../report-actions';
import { formatMethod } from './reports-formatters';
import { REPORTS, type RunResult } from './reports-types';

/**
 * The result, said out loud.
 *
 * Everything else on this page is a number: KPI tiles, a chart, a
 * table. Each of those assumes the reader already knows which figure
 * matters and what a good one looks like. A treasurer does. A branch
 * secretary asked to "check the report before the meeting" does not,
 * and for them a grid of well-formatted numbers is a puzzle rather
 * than an answer.
 *
 * So this says it in a sentence — what the window covered, what the
 * headline figure is, and the one thing worth noticing — before the
 * page shows anything that has to be interpreted. It reads the same
 * rows the table does, so it cannot drift from them.
 */
export function ReportNarrative({
  result,
  scopeCurrency,
}: {
  readonly result: RunResult;
  readonly scopeCurrency: string;
}) {
  const sentences = narrate(result, scopeCurrency);
  if (sentences.length === 0) return null;

  const entry = REPORTS.find((r) => r.value === result.report);

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
      <div className="flex gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            In plain words
          </h3>
          <p className="text-base leading-relaxed text-foreground">{sentences.join(' ')}</p>
          {entry && <p className="text-sm leading-relaxed text-muted-foreground">{entry.readAs}</p>}
        </div>
      </div>
    </section>
  );
}

/** Numbers arrive from PostgREST as strings often enough to always coerce. */
function n(value: unknown): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

function narrate(result: RunResult, currency: string): string[] {
  const money = (v: number) => formatMoney(v, currency);
  const where = result.groupName ? `${result.scopeName} (${result.groupName})` : result.scopeName;
  const when = result.windowLabel.toLowerCase();

  switch (result.report) {
    case 'collections': {
      const rows = result.rows as (CollectionsRow & { __report: 'collections' })[];
      const total = rows.reduce((a, b) => a + n(b.total_collected), 0);
      const payments = rows.reduce((a, b) => a + n(b.payment_count), 0);
      const top = rows.slice().sort((a, b) => n(b.total_collected) - n(a.total_collected))[0];
      const out = [
        `${where} collected ${money(total)} from ${plural(payments, 'payment', 'payments')} across ${plural(rows.length, 'charge', 'charges')} over ${when}.`,
      ];
      if (top && total > 0) {
        const share = Math.round((n(top.total_collected) / total) * 100);
        out.push(
          `The largest single source was ${top.charge_name} at ${money(n(top.total_collected))}, which is ${share}% of everything collected.`,
        );
      }
      if (payments > 0) {
        out.push(`That works out at ${money(total / payments)} per payment on average.`);
      }
      return out;
    }

    case 'arrears': {
      const rows = result.rows as (ArrearsRow & { __report: 'arrears' })[];
      const total = rows.reduce((a, b) => a + n(b.arrears), 0);
      const members = new Set(rows.map((r) => r.member_name)).size;
      if (rows.length === 0)
        return [`Nobody in ${where} has an outstanding balance. Nothing is owed.`];
      const top = rows.slice().sort((a, b) => n(b.arrears) - n(a.arrears))[0];
      const out = [
        `${plural(members, 'member is', 'members are')} behind on payments in ${where}, owing ${money(total)} in total across ${plural(rows.length, 'unpaid item', 'unpaid items')}.`,
      ];
      if (top) {
        out.push(
          `The largest single balance is ${top.member_name} on ${top.charge_name}, at ${money(n(top.arrears))}.`,
        );
      }
      return out;
    }

    case 'treasury_statement': {
      const row = (result.rows as (TreasuryStatementRow & { __report: 'treasury_statement' })[])[0];
      if (!row) return [];
      const opening = n(row.opening_balance);
      const income = n(row.income_sum);
      const expenses = n(row.expense_sum);
      const closing = n(row.closing_balance);
      const movement = closing - opening;
      return [
        `${where} started ${when} with ${money(opening)}, took in ${money(income)}, spent ${money(expenses)}, and ended with ${money(closing)}.`,
        movement === 0
          ? 'The balance finished exactly where it started.'
          : movement > 0
            ? `That is ${money(movement)} better off than at the start of the period.`
            : `That is ${money(Math.abs(movement))} down on where the period started — more went out than came in.`,
      ];
    }

    case 'payment_method_breakdown': {
      const rows = result.rows as (PaymentMethodRow & {
        __report: 'payment_method_breakdown';
      })[];
      const total = rows.reduce((a, b) => a + n(b.total_amount), 0);
      const count = rows.reduce((a, b) => a + n(b.payment_count), 0);
      const top = rows.slice().sort((a, b) => n(b.total_amount) - n(a.total_amount))[0];
      const out = [
        `Over ${when}, ${where} received ${money(total)} through ${plural(rows.length, 'payment method', 'different payment methods')}, across ${plural(count, 'payment', 'payments')}.`,
      ];
      if (top && total > 0) {
        const share = Math.round((n(top.total_amount) / total) * 100);
        out.push(
          `${formatMethod(String(top.method))} carried the most, at ${money(n(top.total_amount))} — ${share}% of the money that came in.`,
        );
      }
      return out;
    }

    case 'expense_report_by_category': {
      const rows = result.rows as (ExpenseByCategoryRow & {
        __report: 'expense_report_by_category';
      })[];
      const total = rows.reduce((a, b) => a + n(b.total_amount), 0);
      const count = rows.reduce((a, b) => a + n(b.expense_count), 0);
      const top = rows.slice().sort((a, b) => n(b.total_amount) - n(a.total_amount))[0];
      const out = [
        `${where} spent ${money(total)} over ${when}, across ${plural(count, 'expense', 'expenses')} in ${plural(rows.length, 'category', 'categories')}.`,
      ];
      if (top && total > 0) {
        const share = Math.round((n(top.total_amount) / total) * 100);
        out.push(
          `The biggest area of spend was ${top.category_name ?? 'uncategorised'} at ${money(n(top.total_amount))}, ${share}% of the total.`,
        );
      }
      return out;
    }

    case 'donation_report': {
      const rows = result.rows as (DonationReportRow & { __report: 'donation_report' })[];
      const total = rows.reduce((a, b) => a + n(b.total_donated), 0);
      const donations = rows.reduce((a, b) => a + n(b.donation_count), 0);
      const named = rows.reduce((a, b) => a + n(b.named_donor_count), 0);
      const anonymous = rows.reduce((a, b) => a + n(b.anonymous_count), 0);
      const top = rows.slice().sort((a, b) => n(b.total_donated) - n(a.total_donated))[0];
      const out = [
        `${where} raised ${money(total)} in donations over ${when}, from ${plural(donations, 'gift', 'gifts')} across ${plural(rows.length, 'campaign', 'campaigns')}.`,
      ];
      if (top) {
        out.push(`${top.charge_name} raised the most, at ${money(n(top.total_donated))}.`);
      }
      if (named + anonymous > 0) {
        const namedShare = Math.round((named / (named + anonymous)) * 100);
        out.push(
          `${namedShare}% of donors gave under their own name; the rest chose to stay anonymous.`,
        );
      }
      return out;
    }
  }
}
