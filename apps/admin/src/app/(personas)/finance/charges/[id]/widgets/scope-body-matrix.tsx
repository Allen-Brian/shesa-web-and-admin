'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

import type { ChargeSummary, MatrixMember, MatrixPeriod, PoolPayment } from './charge-detail-view';
import { ScopeBodyDrillPanel } from './scope-body-drill-panel';
import { ScopeBodyMatrixRow } from './scope-body-matrix-row';
import { deriveCellState } from './shared-cell-state';
import { downloadCsv, formatMoney, formatPeriodShort, slugify } from './shared-formatters';

interface ScopeBodyMatrixProps {
  readonly summary: ChargeSummary;
  readonly periods: readonly MatrixPeriod[];
  readonly members: readonly MatrixMember[];
  readonly paymentLog: readonly PoolPayment[];
}

/**
 * Branch × period matrix — the replacement for ScopeBodyCollection's
 * stacked cards. Each branch is one row, each period one compact
 * column, and clicking a row opens a side sheet with that branch's
 * full period timeline + payment log. 20 branches × 12 months fits on
 * a single screen without endless vertical scroll.
 */
export function ScopeBodyMatrix({ summary, periods, members, paymentLog }: ScopeBodyMatrixProps) {
  const [search, setSearch] = useState('');
  const [activeParty, setActiveParty] = useState<MatrixMember | null>(null);

  const paymentsByObligation = useMemo(() => {
    const map = new Map<string, PoolPayment[]>();
    for (const p of paymentLog) {
      if (!p.obligationId) continue;
      const bucket = map.get(p.obligationId) ?? [];
      bucket.push(p);
      map.set(p.obligationId, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    }
    return map;
  }, [paymentLog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.fullName.toLowerCase().includes(q));
  }, [members, search]);

  const activePeriods = periods.filter((p) => !p.isUpcoming);
  const gridStyle = { ['--n-periods' as string]: periods.length } as React.CSSProperties;

  const exportCsv = () => {
    const header = ['Branch', 'Scope type', 'Period', 'Owed', 'Paid', 'Outstanding', 'Status'];
    const rows: string[][] = [];
    for (const m of members) {
      periods.forEach((p, idx) => {
        if (p.isUpcoming) return;
        const c = m.cells[idx];
        if (!c) return;
        rows.push([
          m.fullName,
          m.scopeType ?? '',
          p.periodStart ?? '',
          c.owed.toFixed(2),
          c.paid.toFixed(2),
          Math.max(0, c.owed - c.paid).toFixed(2),
          deriveCellState(c),
        ]);
      });
    }
    downloadCsv(`${slugify(summary.name)}-matrix`, [header, ...rows]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {members.length} obligor{members.length === 1 ? '' : 's'} · {activePeriods.length} active
          period{activePeriods.length === 1 ? '' : 's'}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches…"
            className="h-8 w-56 text-xs"
          />
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="min-w-225" style={gridStyle}>
          <div className="grid grid-cols-[minmax(180px,220px)_repeat(var(--n-periods),minmax(56px,1fr))_minmax(180px,220px)_32px] items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Branch</span>
            {periods.map((p) => (
              <span key={p.key} className="text-center">
                {formatPeriodShort(p)}
              </span>
            ))}
            <span className="text-right">Total · % paid</span>
            <span />
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No branches match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filtered.map((party) => (
              <ScopeBodyMatrixRow
                key={party.memberId}
                party={party}
                periods={periods}
                currency={summary.currency}
                onOpen={setActiveParty}
              />
            ))
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Click a branch row to see its full period timeline + payment log. Column headers use each
        period&apos;s start month; totals cover active periods only. Amounts are in{' '}
        {formatMoney(0, summary.currency).split(' ')[1]}.
      </p>

      <ScopeBodyDrillPanel
        open={activeParty !== null}
        onOpenChange={(o) => !o && setActiveParty(null)}
        party={activeParty}
        periods={periods}
        currency={summary.currency}
        paymentsByObligation={paymentsByObligation}
      />
    </div>
  );
}
