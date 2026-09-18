import { ScrollText } from 'lucide-react';

import { loadBallots, loadEdition } from '../load-voting';
import { BallotRegister } from '../widgets/ballot-register';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Ballots' };

export default async function BallotsPage() {
  const edition = await loadEdition();
  const ballots = edition ? await loadBallots(edition.id) : [];

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Voting
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <ScrollText className="h-6 w-6" />
          Ballots
        </h1>
        <p className="text-sm text-muted-foreground">
          Who voted, not how. Exco ballots carry a post and a name so you can recognise one that
          should not be there; voiding strikes a ballot from the tally without deleting it.
        </p>
      </header>

      {edition ? (
        <BallotRegister ballots={ballots} />
      ) : (
        <p className="text-sm text-muted-foreground">No awards cycle exists yet.</p>
      )}
    </section>
  );
}
