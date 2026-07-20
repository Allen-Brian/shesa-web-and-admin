import { Ticket } from 'lucide-react';

import { loadAgmTickets } from './loader';
import { AgmKpiStrip } from './widgets/kpi-strip';
import { AgmTicketsTable } from './widgets/tickets-table';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — AGM 2026 tickets' };

/**
 * Site Administrator (exco) view of AGM 2026 registrations. Read-first
 * plus cancel/reinstate — the finance persona owns the reconciliation
 * flow (issued → paid).
 */
export default async function ExcoAgmTicketsPage() {
  const tickets = await loadAgmTickets();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AGM 2026
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Ticket className="h-6 w-6" />
          AGM tickets
        </h1>
        <p className="text-sm text-muted-foreground">
          Every registration submitted through the public /agm-2026 page. Finance flips issued
          tickets to paid once payment is reconciled.
        </p>
      </header>

      <AgmKpiStrip tickets={tickets} />
      <AgmTicketsTable tickets={tickets} canReconcile={false} />
    </section>
  );
}
