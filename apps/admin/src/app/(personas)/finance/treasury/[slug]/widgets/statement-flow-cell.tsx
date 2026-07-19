import type * as React from 'react';

import { GradientPanel } from '@shesa/ui';

/**
 * One of the four cards inside the statement flow strip — Opening /
 * Income / Expenses / Closing. `accent` tints the value emerald or
 * destructive-red; `emphasise` marks the Closing card with a
 * primary-tint background so the eye lands there first.
 */
export function StatementFlowCell({
  label,
  value,
  currency,
  hint,
  accent,
  icon,
  emphasise,
}: {
  readonly label: string;
  readonly value: number;
  readonly currency: string;
  readonly hint: string;
  readonly accent?: 'income' | 'expense';
  readonly icon?: React.ReactNode;
  readonly emphasise?: boolean;
}) {
  const valueClass =
    accent === 'income'
      ? 'text-emerald-700 dark:text-emerald-400'
      : accent === 'expense'
        ? 'text-destructive'
        : value < 0
          ? 'text-destructive'
          : 'text-foreground';

  return (
    <GradientPanel
      muted={!emphasise}
      className={`flex flex-col gap-1.5 rounded-xl p-4 ${emphasise ? 'border-primary/40' : ''}`}
      style={
        emphasise
          ? { background: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-card))' }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span
            className={
              accent === 'income'
                ? 'text-emerald-600'
                : accent === 'expense'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }
          >
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-semibold tabular-nums leading-none ${valueClass}`}>
          {new Intl.NumberFormat().format(value)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{currency}</span>
      </div>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </GradientPanel>
  );
}
