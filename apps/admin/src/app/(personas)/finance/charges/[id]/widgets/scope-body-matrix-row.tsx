'use client';

import { useMemo } from 'react';
import { Building2, ChevronRight } from 'lucide-react';

import type { MatrixMember, MatrixPeriod } from './charge-detail-types';
import { ScopeBodyMatrixCell } from './scope-body-matrix-cell';
import { formatMoney } from './shared-formatters';

interface ScopeBodyMatrixRowProps {
  readonly party: MatrixMember;
  readonly periods: readonly MatrixPeriod[];
  readonly currency: string;
  readonly onOpen: (party: MatrixMember) => void;
}

/**
 * One branch's row in the matrix: identity column on the left, one
 * compact cell per period, then a totals + coverage bar on the right,
 * capped by a chevron that opens the drill panel.
 *
 * Grid columns are configured on the parent table so the header and
 * every row stay perfectly aligned — see ScopeBodyMatrix's
 * `grid-cols-[...]` template.
 */
export function ScopeBodyMatrixRow({ party, periods, currency, onOpen }: ScopeBodyMatrixRowProps) {
  const totals = useMemo(() => {
    let paid = 0;
    let owed = 0;
    party.cells.forEach((c, idx) => {
      const p = periods[idx];
      if (!c || !p || p.isUpcoming) return;
      paid += c.paid;
      owed += c.owed;
    });
    return {
      paid,
      owed,
      outstanding: Math.max(0, owed - paid),
      coverage: owed > 0 ? Math.min(1, paid / owed) : 1,
    };
  }, [party.cells, periods]);

  const percent = Math.round(totals.coverage * 100);
  const barColor =
    percent >= 100
      ? 'bg-emerald-500'
      : percent >= 70
        ? 'bg-sky-500'
        : percent >= 40
          ? 'bg-amber-500'
          : 'bg-destructive';

  return (
    <button
      type="button"
      onClick={() => onOpen(party)}
      className="grid w-full grid-cols-[minmax(180px,220px)_repeat(var(--n-periods),minmax(56px,1fr))_minmax(180px,220px)_32px] items-center gap-2 border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-foreground">{party.fullName}</span>
          {party.scopeType && (
            <span className="truncate text-[11px] capitalize text-muted-foreground">
              {party.scopeType} · as body
            </span>
          )}
        </div>
      </div>

      {periods.map((p, idx) => (
        <ScopeBodyMatrixCell
          key={p.key}
          cell={party.cells[idx] ?? null}
          isUpcoming={p.isUpcoming}
        />
      ))}

      <div className="flex flex-col gap-1 pl-2">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-muted-foreground tabular-nums">
            {formatMoney(totals.paid, currency)}
          </span>
          <span
            className={`text-sm font-semibold tabular-nums ${percent >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}
          >
            {percent}%
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          of {formatMoney(totals.owed, currency)}
          {totals.outstanding > 0 && ` · ${formatMoney(totals.outstanding, currency)} left`}
        </span>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
