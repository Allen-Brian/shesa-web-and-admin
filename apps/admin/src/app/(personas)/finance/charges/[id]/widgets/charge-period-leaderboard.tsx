'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import type { PeriodStatsRow } from './charge-detail-types';
import { formatMoney } from './shared-formatters';

const PAGE_SIZE = 10;

/**
 * Best/worst-coverage subtitle + full period table. Sorted best-first
 * (the ScopeBody + Matrix reports flip this before passing in). The
 * mini coverage bar per row matches the CoverageBar in the matrix
 * table so operators can eyeball the same colours consistently.
 *
 * Table is borderless — the header row + zebra hover states carry the
 * structure. Pagination clamps the visible slice to 10 rows so a
 * couple-year run doesn't turn the reports tab into a scroll canyon.
 */
export function ChargePeriodLeaderboard({
  rows,
  bestLabel,
  worstLabel,
  bestCoverage,
  worstCoverage,
  currency,
}: {
  readonly rows: readonly PeriodStatsRow[];
  readonly bestLabel: string;
  readonly worstLabel: string;
  readonly bestCoverage: number | null;
  readonly worstCoverage: number | null;
  readonly currency: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageIdx = Math.min(page, totalPages - 1);
  const start = pageIdx * PAGE_SIZE;
  const visible = useMemo(() => rows.slice(start, start + PAGE_SIZE), [rows, start]);

  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">Period performance</span>
        <span className="text-xs text-muted-foreground">
          Best <span className="font-medium text-foreground">{bestLabel}</span>
          {bestCoverage !== null && (
            <span className="ml-1 text-emerald-600 dark:text-emerald-400">
              ({Math.round(bestCoverage * 100)}%)
            </span>
          )}
          {' · '}Worst <span className="font-medium text-foreground">{worstLabel}</span>
          {worstCoverage !== null && (
            <span className="ml-1 text-destructive">({Math.round(worstCoverage * 100)}%)</span>
          )}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Period</th>
            <th className="px-3 py-2 text-right font-medium">Coverage</th>
            <th className="px-3 py-2 text-right font-medium">Paid</th>
            <th className="px-3 py-2 text-right font-medium">Outstanding</th>
            <th className="px-3 py-2 text-right font-medium">Members paid</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const percent = Math.round(r.coverage * 100);
            return (
              <tr key={r.key} className="transition-colors hover:bg-muted/40">
                <td className="px-3 py-2 font-medium text-foreground">{r.period}</td>
                <td className="px-3 py-2 text-right">
                  <div className="ml-auto flex w-24 items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          percent >= 100
                            ? 'bg-emerald-500'
                            : percent >= 70
                              ? 'bg-sky-500'
                              : percent >= 40
                                ? 'bg-amber-500'
                                : 'bg-destructive'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    <span className="w-9 text-xs tabular-nums text-foreground">{percent}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {formatMoney(r.Paid, currency)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${
                    r.Outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {r.Outstanding > 0 ? formatMoney(r.Outstanding, currency) : '—'}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {r.paidMembers}/{r.totalMembers}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <PeriodPagination
          page={pageIdx}
          totalPages={totalPages}
          totalRows={rows.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </GradientPanel>
  );
}

interface PeriodPaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly totalRows: number;
  readonly pageSize: number;
  readonly onPageChange: (next: number) => void;
}

/**
 * Compact pagination footer. Ellipsis-collapses the middle when there
 * are more than seven pages so we never blow out on a long-lived
 * charge's history.
 */
function PeriodPagination({
  page,
  totalPages,
  totalRows,
  pageSize,
  onPageChange,
}: PeriodPaginationProps) {
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalRows);
  const pages = buildVisiblePages(page + 1, totalPages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
      <span>
        {from}–{to} of {totalRows}
      </span>
      <div className="flex items-center gap-1.5">
        <PageBtn
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </PageBtn>
        {pages.map((p, i) =>
          typeof p === 'string' ? (
            <span key={`${p}-${i}`} className="px-1" aria-hidden>
              …
            </span>
          ) : (
            <PageBtn
              key={p}
              current={p === page + 1}
              onClick={() => onPageChange(p - 1)}
              aria-label={`Page ${p}`}
            >
              {p}
            </PageBtn>
          ),
        )}
        <PageBtn
          aria-label="Next page"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  current,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { current?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={
        'inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs transition-colors ' +
        (current
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground') +
        ' disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:outline-none focus-visible:ring-0'
      }
      {...props}
    >
      {children}
    </button>
  );
}

function buildVisiblePages(
  current: number,
  total: number,
): (number | 'dots-left' | 'dots-right')[] {
  if (total <= 1) return [1];
  const maxVisible = 5;
  const pages: (number | 'dots-left' | 'dots-right')[] = [];
  const showLeftDots = current > 3;
  const showRightDots = current < total - 2;
  pages.push(1);
  if (showLeftDots && !showRightDots) {
    pages.push('dots-left');
    for (let i = total - (maxVisible - 2); i < total; i++) pages.push(i);
  } else if (!showLeftDots && showRightDots) {
    for (let i = 2; i <= maxVisible - 1; i++) pages.push(i);
    pages.push('dots-right');
  } else if (showLeftDots && showRightDots) {
    pages.push('dots-left');
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push('dots-right');
  } else {
    for (let i = 2; i < total; i++) pages.push(i);
  }
  pages.push(total);
  return pages;
}
