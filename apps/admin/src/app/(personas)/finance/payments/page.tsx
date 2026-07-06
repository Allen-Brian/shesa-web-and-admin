import { LandPlot } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Payments' };

export default function PaymentsPage() {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Operations
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <LandPlot className="h-6 w-6" />
          Payments
        </h1>
        <p className="text-sm text-muted-foreground">
          Record manual/cash payments, pay-on-behalf, reverse. Every action append-only.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Payments list + record-manual + reversal flow land in the next slice.
      </div>
    </section>
  );
}
