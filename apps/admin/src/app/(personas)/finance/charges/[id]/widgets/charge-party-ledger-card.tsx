import { Building2 } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { formatMoney } from './shared-formatters';

/**
 * One-per-scope-body card on the ScopeBody reports flavour. Shows a
 * progress bar plus the 3-up paid / owed / remaining split. Icon is
 * always a building since scope-body obligations are collective
 * (chapter, branch, batch).
 */
export function ChargePartyLedgerCard({
  name,
  scopeType,
  paid,
  owed,
  outstanding,
  coverage,
  currency,
}: {
  readonly name: string;
  readonly scopeType: string | null;
  readonly paid: number;
  readonly owed: number;
  readonly outstanding: number;
  readonly coverage: number;
  readonly currency: string;
}) {
  const percent = Math.round(coverage * 100);
  const barColor =
    percent >= 100
      ? 'bg-emerald-500'
      : percent >= 70
        ? 'bg-sky-500'
        : percent >= 40
          ? 'bg-amber-500'
          : 'bg-destructive';
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">{name}</span>
            {scopeType && (
              <span className="text-[11px] italic capitalize text-muted-foreground">
                {scopeType} · as body
              </span>
            )}
          </div>
        </div>
        <span
          className={`text-lg font-semibold tabular-nums ${
            percent >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
          }`}
        >
          {percent}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(paid, currency)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Owed</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(owed, currency)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Remaining</span>
          <span
            className={`font-medium tabular-nums ${
              outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {outstanding > 0 ? formatMoney(outstanding, currency) : '—'}
          </span>
        </div>
      </div>
    </GradientPanel>
  );
}
