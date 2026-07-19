import { CheckCircle2, XCircle } from 'lucide-react';

type SummaryAccent = 'muted' | 'ok' | 'error';

interface BranchImportSummaryCardProps {
  readonly label: string;
  readonly value: number;
  readonly accent?: SummaryAccent;
}

const COLORS: Record<SummaryAccent, string> = {
  muted: 'text-foreground',
  ok: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-destructive',
};

export function BranchImportSummaryCard({
  label,
  value,
  accent = 'muted',
}: BranchImportSummaryCardProps) {
  const Icon = accent === 'error' ? XCircle : accent === 'ok' ? CheckCircle2 : null;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`text-xl font-semibold ${COLORS[accent]}`}>{value}</div>
    </div>
  );
}
