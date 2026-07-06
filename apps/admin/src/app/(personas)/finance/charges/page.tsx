import { BadgeDollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Charges' };

/**
 * Charges page — dues + levies.
 *
 * Stubbed for M10 slice 1. The DB primitives are complete (charges CRUD,
 * generate-obligations, resolver, etc.); this page will list active
 * charges + let Finance create/update/archive them in the next slice.
 */
export default function ChargesPage() {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Money in
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BadgeDollarSign className="h-6 w-6" />
          Charges
        </h1>
        <p className="text-sm text-muted-foreground">
          Dues, levies, and recurring per-member obligations at scopes you can see.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Charges list + create/update/archive lands in the next slice. The backend engine
        (charges/create, /update, /archive, /generate-obligations) is already wired.
      </div>
    </section>
  );
}
