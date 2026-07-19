import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

const STYLES: Record<string, string> = {
  up: 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-400',
  down: 'text-destructive bg-destructive/10',
  flat: 'text-muted-foreground bg-muted/40',
};

/**
 * Small pill showing month-over-month percent change. Colour + icon +
 * signed label are all driven by the sign of `value`.
 */
export function DashboardTrendBadge({ value }: { readonly value: number }) {
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  const label = dir === 'flat' ? '±0%' : `${dir === 'up' ? '+' : ''}${value}%`;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${STYLES[dir]}`}
      title="vs last month"
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
