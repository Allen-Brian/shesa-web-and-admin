'use client';

import { Building2, X } from 'lucide-react';

import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@shesa/ui';

import type { MatrixMember, MatrixPeriod, PoolPayment } from './charge-detail-view';
import { CELL_DOT, CELL_LABEL, deriveCellState } from './shared-cell-state';
import { formatMethod, formatMoney, formatPeriodHeader } from './shared-formatters';

interface ScopeBodyDrillPanelProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly party: MatrixMember | null;
  readonly periods: readonly MatrixPeriod[];
  readonly currency: string;
  readonly paymentsByObligation: ReadonlyMap<string, readonly PoolPayment[]>;
}

/**
 * Slides out from the right when a branch row is clicked. Renders the
 * full period-by-period ledger for one branch — every cell as a stacked
 * card with the payment log inline. This is where the old
 * ScopeBodyCollection layout lives now, focused on one branch instead
 * of every branch at once.
 */
export function ScopeBodyDrillPanel({
  open,
  onOpenChange,
  party,
  periods,
  currency,
  paymentsByObligation,
}: ScopeBodyDrillPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-xl flex-col gap-0 p-0">
        {party && (
          <>
            <SheetHeader className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <SheetTitle className="text-base">{party.fullName}</SheetTitle>
                    {party.scopeType && (
                      <span className="text-xs capitalize text-muted-foreground">
                        {party.scopeType} · as body
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {periods.map((p, idx) => {
                const cell = party.cells[idx];
                if (p.isUpcoming) return null;
                if (!cell) return null;
                const state = deriveCellState(cell);
                const payments = paymentsByObligation.get(cell.obligationId) ?? [];
                const remaining = Math.max(0, cell.owed - cell.paid);
                return (
                  <div key={p.key} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${CELL_DOT[state]}`} />
                        <span className="text-sm font-medium text-foreground">
                          {formatPeriodHeader(p)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {CELL_LABEL[state]}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatMoney(cell.paid, currency)} / {formatMoney(cell.owed, currency)}
                        {remaining > 0 && (
                          <span className="ml-1 text-destructive">
                            · {formatMoney(remaining, currency)} left
                          </span>
                        )}
                      </span>
                    </div>
                    {payments.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3 text-xs">
                        {payments.map((pay) => (
                          <li key={pay.id} className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">
                              {new Date(pay.createdAt).toLocaleDateString()} ·{' '}
                              {formatMethod(pay.method)}
                              {pay.isReversal && (
                                <span className="ml-1 text-destructive">(reversal)</span>
                              )}
                            </span>
                            <span
                              className={`tabular-nums ${pay.isReversal ? 'text-destructive' : 'text-foreground'}`}
                            >
                              {pay.isReversal ? '-' : ''}
                              {formatMoney(pay.amount, pay.currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
