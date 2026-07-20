import { Ticket } from 'lucide-react';

import { loadAgmTickets } from '../../exco/agm-tickets/loader';
import { AgmKpiStrip } from '../../exco/agm-tickets/widgets/kpi-strip';
import { AgmTicketsTable } from '../../exco/agm-tickets/widgets/tickets-table';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — AGM 2026 tickets' };

/**
 * Finance-persona view of AGM 2026 registrations. Same loader/table as
 * the Site Administrator's page, but `canReconcile` is true here so
 * the per-row menu surfaces the "Mark as paid" action.
 */
export default async function FinanceAgmTicketsPage() {
  const tickets = await loadAgmTickets();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AGM 2026
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Ticket className="h-6 w-6" />
          AGM tickets · reconciliation
        </h1>
        <p className="text-sm text-muted-foreground">
          Reconcile issued tickets against actual payments. Once the money lands, mark the ticket
          paid — the public receipt updates immediately.
        </p>
      </header>

      <AgmKpiStrip tickets={tickets} />
      <AgmTicketsTable tickets={tickets} canReconcile />
    </section>
  );
}
