import type {
  MatrixFilterCounts,
  MatrixMember,
  MatrixPeriod,
  MatrixRow,
  MemberFilter,
} from './charge-detail-types';

/**
 * Reduces a member's per-period cells into paid / owed / outstanding
 * totals, and classifies the row into a `MemberFilter` bucket used by
 * the segmented control above the matrix.
 *
 * Upcoming periods are excluded from the rollup — they represent
 * pipeline visibility, not amounts owed today.
 */
export interface MatrixMemberTotals {
  readonly member: MatrixMember;
  readonly paid: number;
  readonly owed: number;
  readonly outstanding: number;
  readonly coverage: number;
  readonly state: MemberFilter;
}

export function buildMatrixMemberTotals(
  members: readonly MatrixMember[],
  periods: readonly MatrixPeriod[],
): MatrixMemberTotals[] {
  return members.map((m) => {
    const t = m.cells.reduce(
      (acc, c, idx) => {
        const p = periods[idx];
        if (!c || !p || p.isUpcoming) return acc;
        acc.paid += c.paid;
        acc.owed += c.owed;
        return acc;
      },
      { paid: 0, owed: 0 },
    );
    const outstanding = Math.max(0, t.owed - t.paid);
    const coverage = t.owed > 0 ? Math.min(1, t.paid / t.owed) : 1;
    const state: MemberFilter =
      t.owed <= 0.0001
        ? 'fully_paid'
        : t.paid <= 0.0001
          ? 'unpaid'
          : outstanding <= 0.0001
            ? 'fully_paid'
            : 'partial';
    return { member: m, paid: t.paid, owed: t.owed, outstanding, coverage, state };
  });
}

/**
 * Filters + sorts the pre-computed totals down to a `MatrixRow[]`
 * ready for AG-Grid. Sort is "most outstanding first" so operators
 * see who needs chasing at the top; ties break on full name for
 * determinism.
 */
export function filterAndRankMatrixRows(
  withTotals: readonly MatrixMemberTotals[],
  search: string,
  filter: MemberFilter,
): readonly MatrixRow[] {
  const q = search.trim().toLowerCase();
  return withTotals
    .filter((row) => {
      if (q && !row.member.fullName.toLowerCase().includes(q)) return false;
      if (filter === 'all') return true;
      if (filter === 'behind') return row.outstanding > 0.0001;
      if (filter === 'fully_paid') return row.state === 'fully_paid' && row.owed > 0;
      if (filter === 'partial') return row.state === 'partial';
      if (filter === 'unpaid') return row.state === 'unpaid';
      return true;
    })
    .sort(
      (a, b) => b.outstanding - a.outstanding || a.member.fullName.localeCompare(b.member.fullName),
    )
    .map((row, i) => ({
      ...row.member,
      serial: i + 1,
      _totalPaid: row.paid,
      _totalOwed: row.owed,
      _outstanding: row.outstanding,
      _coverage: row.coverage,
    }));
}

/** Rolls the totals up into the counts feeding the filter chip row. */
export function computeMatrixFilterCounts(
  withTotals: readonly MatrixMemberTotals[],
): MatrixFilterCounts {
  let behind = 0;
  let fullyPaid = 0;
  let partial = 0;
  let unpaid = 0;
  for (const r of withTotals) {
    if (r.owed <= 0.0001) continue;
    if (r.state === 'fully_paid') fullyPaid += 1;
    else if (r.state === 'partial') partial += 1;
    else if (r.state === 'unpaid') unpaid += 1;
    if (r.outstanding > 0.0001) behind += 1;
  }
  return { all: withTotals.length, behind, fullyPaid, partial, unpaid };
}

/**
 * The "current" period — most recent non-upcoming period whose start
 * is on-or-before today. Used to auto-scroll the matrix so the active
 * month lands in view and to highlight the header column.
 */
export function pickCurrentPeriodKey(periods: readonly MatrixPeriod[]): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const activePast = periods
    .filter((p) => !p.isUpcoming && p.periodStart != null)
    .filter((p) => (p.periodStart ?? '') <= today);
  if (activePast.length > 0) return activePast[activePast.length - 1]!.key;
  // Fall back to the newest existing period if nothing is on-or-before
  // today (e.g. brand-new charge with no obligations yet).
  const anyNonUpcoming = periods.filter((p) => !p.isUpcoming);
  return anyNonUpcoming[anyNonUpcoming.length - 1]?.key ?? null;
}
