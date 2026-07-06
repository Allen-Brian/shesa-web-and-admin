import { Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Expenses' };

export default function ExpensesPage() {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Money out
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wallet className="h-6 w-6" />
          Expenses
        </h1>
        <p className="text-sm text-muted-foreground">
          Money out of a treasury. Below-threshold records; above enters pending approval.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Expenses list + record + approve + reverse flow lands in the next slice.
      </div>
    </section>
  );
}
