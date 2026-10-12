'use client';

import { ArrowDownRight, Building2, User } from 'lucide-react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@shesa/ui';

import type { ChargeDetailActions, MatrixCell, PoolPayment } from './charge-detail-types';
import { CELL_DOT, CELL_LABEL, deriveCellState } from './shared-cell-state';
import { formatMoney } from './shared-formatters';
import { ChargeCellActionBar } from './charge-cell-action-bar';

/** Prettify a raw payment_method enum value for display. */
function methodLabel(method: string): string {
  return method
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Right-side detail sheet for a single matrix cell (one member × one
 * period obligation). Mirrors the transactions detail sheet: a header
 * with the amount + state, a balance block, the payment log for this
 * obligation, and — for a Finance viewer on an unsettled cell — the
 * record-payment / waive action bar. The Sheet primitive supplies its
 * own close (X), so none is added here.
 */
export function ChargeMatrixCellSheet({
  open,
  onClose,
  chargeName,
  memberName,
  isScopeBody,
  periodLabel,
  cell,
  payments,
  actions,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly chargeName: string;
  readonly memberName: string;
  readonly isScopeBody: boolean;
  readonly periodLabel: string;
  readonly cell: MatrixCell | null;
  readonly payments: readonly PoolPayment[];
  readonly actions?: ChargeDetailActions;
}) {
  const state = cell ? deriveCellState(cell) : null;
  const outstanding = cell ? Math.max(0, cell.owed - cell.paid) : 0;
  const actionable = state === 'open' || state === 'partial' || state === 'overdue';
  const showActions =
    !!cell && !!actions && actionable && (actions.canRecordPayment || actions.canForgive);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-4 overflow-y-auto sm:max-w-md">
        {cell && state && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${CELL_DOT[state]}`} aria-hidden />
                <SheetTitle>{formatMoney(cell.owed, cell.currency)}</SheetTitle>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {CELL_LABEL[state]}
                </span>
                {cell.prorated && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    Prorated
                  </span>
                )}
              </div>
              <SheetDescription className="flex items-center gap-1.5">
                {isScopeBody ? (
                  <Building2 className="h-3.5 w-3.5" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
                {memberName} · {periodLabel} · {chargeName}
              </SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Owed" value={formatMoney(cell.owed, cell.currency)} />
              <Stat label="Paid" value={formatMoney(cell.paid, cell.currency)} />
              <Stat
                label="Outstanding"
                value={outstanding > 0 ? formatMoney(outstanding, cell.currency) : '—'}
                danger={outstanding > 0}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Payments
              </span>
              {payments.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  No payments recorded for this period.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-foreground">{p.payerLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          {methodLabel(p.method)} · {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 shrink-0 tabular-nums ${
                          p.isReversal ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                        }`}
                      >
                        {p.isReversal && <ArrowDownRight className="h-3.5 w-3.5" />}
                        {formatMoney(p.amount, p.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {showActions && (
              <ChargeCellActionBar
                obligationId={cell.obligationId}
                outstanding={outstanding}
                currency={cell.currency}
                canRecordPayment={!!actions?.canRecordPayment}
                canForgive={!!actions?.canForgive}
                onDone={onClose}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  readonly label: string;
  readonly value: string;
  readonly danger?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border p-2.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-medium tabular-nums ${danger ? 'text-destructive' : 'text-foreground'}`}
      >
        {value}
      </span>
    </div>
  );
}
