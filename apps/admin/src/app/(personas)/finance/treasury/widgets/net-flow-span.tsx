import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { formatAmount } from './treasury-landing-helpers';

/**
 * Two-part inline chip: a signed net-flow amount with tone + trend
 * icon on the left, then a companion label span for context on the
 * right. Positive = emerald, negative = destructive, zero = muted.
 */
export function NetFlowSpan({
  net,
  currency,
  label,
}: {
  readonly net: number;
  readonly currency: string;
  readonly label: string;
}) {
  const positive = net > 0;
  const negative = net < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const tone = positive
    ? 'text-emerald-600 dark:text-emerald-400'
    : negative
      ? 'text-destructive'
      : 'text-muted-foreground';
  return (
    <>
      <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
        <Icon className="h-3 w-3" />
        {net >= 0 ? '+' : ''}
        {formatAmount(net)} {currency}
      </span>
      <span>{label}</span>
    </>
  );
}
