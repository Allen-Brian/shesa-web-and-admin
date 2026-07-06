import { Receipt } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Receipts' };

export default function ReceiptsPage() {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Operations
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Receipt className="h-6 w-6" />
          Receipts
        </h1>
        <p className="text-sm text-muted-foreground">
          Every recorded payment auto-generates a receipt with a QR verification token.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Receipt browser + printable render + public verify URL construction land in the next slice.
      </div>
    </section>
  );
}
