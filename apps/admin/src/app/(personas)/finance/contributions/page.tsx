import { Target } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Contributions' };

export default function ContributionsPage() {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Money in
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Target className="h-6 w-6" />
          Contributions
        </h1>
        <p className="text-sm text-muted-foreground">
          Goal, open, and ticketed contributions. Approve, close, and extend live campaigns.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Contribution list + approve/close/extend controls land in the next slice.
      </div>
    </section>
  );
}
