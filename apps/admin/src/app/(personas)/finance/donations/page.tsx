import { CircleDollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Donations' };

export default function DonationsPage() {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Money in
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CircleDollarSign className="h-6 w-6" />
          Donations
        </h1>
        <p className="text-sm text-muted-foreground">
          Freewill gifts. Includes public web donations plus admin-recorded walk-ins.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Donation campaigns list + walk-in entry land in the next slice.
      </div>
    </section>
  );
}
