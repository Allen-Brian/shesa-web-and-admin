import { ClipboardList } from 'lucide-react';

import { loadNominations, loadVoting } from '../load-voting';
import { NominationsReview } from '../widgets/nominations-review';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Nominations' };

export default async function NominationsPage() {
  const [{ edition, awards }, nominations] = await Promise.all([loadVoting(), loadNominations()]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Voting
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <ClipboardList className="h-6 w-6" />
          Nominations
        </h1>
        <p className="text-sm text-muted-foreground">
          Every name the membership has put forward. Approve the ones worth considering, reject the
          rest, and drop the final list onto the ballot.
        </p>
      </header>

      {edition ? (
        <NominationsReview nominations={nominations} awards={awards} phase={edition.phase} />
      ) : (
        <p className="text-sm text-muted-foreground">No awards cycle exists yet.</p>
      )}
    </section>
  );
}
