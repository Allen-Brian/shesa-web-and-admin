import type { AgmTicketRow } from './types';

interface Props {
  readonly tickets: readonly AgmTicketRow[];
}

/** Four small stat cards above the tickets table. */
export function AgmKpiStrip({ tickets }: Props) {
  const total = tickets.length;
  const issued = tickets.filter((t) => t.status === 'issued').length;
  const paid = tickets.filter((t) => t.status === 'paid').length;
  const totalXaf = tickets
    .filter((t) => t.status !== 'cancelled')
    .reduce((n, t) => n + t.amountXaf, 0);

  const cards: readonly { readonly label: string; readonly value: string }[] = [
    { label: 'Total registrations', value: total.toLocaleString() },
    { label: 'Awaiting reconciliation', value: issued.toLocaleString() },
    { label: 'Paid', value: paid.toLocaleString() },
    { label: 'Sum pledged (XAF)', value: totalXaf.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {c.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
