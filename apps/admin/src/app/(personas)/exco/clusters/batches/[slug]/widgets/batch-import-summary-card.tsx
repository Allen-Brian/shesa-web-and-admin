import { CheckCircle2, XCircle } from 'lucide-react';

interface BatchImportSummaryCardProps {
  readonly label: string;
  readonly value: number;
  readonly accent?: 'muted' | 'ok' | 'error';
}

const COLORS: Record<string, string> = {
  muted: 'text-foreground',
  ok: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-destructive',
};

export function BatchImportSummaryCard({
  label,
  value,
  accent = 'muted',
}: BatchImportSummaryCardProps) {
  const Icon = accent === 'error' ? XCircle : accent === 'ok' ? CheckCircle2 : null;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`text-xl font-semibold ${COLORS[accent]}`}>{value}</div>
    </div>
  );
}
