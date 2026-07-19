import type { ChargeDetailMatrixProps } from './charge-detail-types';
import { downloadCsv, formatPeriodHeader, slugify } from './shared-formatters';

/**
 * Serialises the matrix into a CSV shaped for accountants — one
 * "Period Paid" and one "Period Owed" column per active period plus
 * per-row totals. Upcoming periods are dropped since they hold no
 * payment data yet.
 */
export function exportChargeMatrixCsv(
  props: Pick<ChargeDetailMatrixProps, 'summary' | 'periods' | 'members'>,
): void {
  const { summary, periods, members } = props;
  const activePeriods = periods.filter((p) => !p.isUpcoming);
  const header = [
    'Member',
    ...activePeriods.map((p) => `${formatPeriodHeader(p)} Paid`),
    ...activePeriods.map((p) => `${formatPeriodHeader(p)} Owed`),
    'Total Paid',
    'Total Owed',
    'Outstanding',
    'Coverage %',
    'Currency',
  ];
  const rows: string[][] = members.map((m) => {
    const paidCols: string[] = [];
    const owedCols: string[] = [];
    let totalPaid = 0;
    let totalOwed = 0;
    periods.forEach((p, idx) => {
      if (p.isUpcoming) return;
      const c = m.cells[idx];
      paidCols.push(c ? c.paid.toFixed(2) : '');
      owedCols.push(c ? c.owed.toFixed(2) : '');
      if (c) {
        totalPaid += c.paid;
        totalOwed += c.owed;
      }
    });
    const outstanding = Math.max(0, totalOwed - totalPaid);
    const coverage = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 100;
    return [
      m.fullName,
      ...paidCols,
      ...owedCols,
      totalPaid.toFixed(2),
      totalOwed.toFixed(2),
      outstanding.toFixed(2),
      coverage.toFixed(1),
      summary.currency,
    ];
  });
  downloadCsv(`${slugify(summary.name)}-collection`, [header, ...rows]);
}
