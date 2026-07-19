'use client';

interface SummaryStatProps {
  readonly label: string;
  readonly value: number | null;
  readonly highlight?: boolean;
}

/**
 * One labeled tabular-number cell inside the payment dialog's summary
 * strip. `null` renders as an em-dash; `highlight` turns the value
 * destructive-red (used for the still-remaining amount).
 */
export function SummaryStat({ label, value, highlight = false }: SummaryStatProps) {
  const tone =
    value === null ? 'text-muted-foreground' : highlight ? 'text-destructive' : 'text-foreground';
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${tone}`}>
        {value === null ? '—' : new Intl.NumberFormat().format(value)}
      </span>
    </div>
  );
}
