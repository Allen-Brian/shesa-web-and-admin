import { GradientPanel } from '@shesa/ui';

import { formatMoney } from './shared-formatters';

/**
 * Big "collection progress" bar + 3-up numbers underneath. Shared by
 * the members-matrix and scope-body report layouts — the number the
 * eye lands on when scrolling into Reports.
 */
export function ChargeProgressPanel({
  progress,
  collected,
  outstanding,
  fullyPaid,
  totalMembers,
  currency,
}: {
  readonly progress: number;
  readonly collected: number;
  readonly outstanding: number;
  readonly fullyPaid: number;
  readonly totalMembers: number;
  readonly currency: string;
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Collection progress
        </span>
        <span className="text-3xl font-semibold tabular-nums text-foreground">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Collected</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(collected, currency)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Outstanding</span>
          <span
            className={`font-medium tabular-nums ${
              outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {formatMoney(outstanding, currency)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Fully paid</span>
          <span className="font-medium text-foreground tabular-nums">
            {fullyPaid}/{totalMembers}
          </span>
        </div>
      </div>
    </GradientPanel>
  );
}
