import { Trophy } from 'lucide-react';

import { loadEditionSummaries } from './load-voting';
import { CeremonyIndex } from './widgets/ceremony-index';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Voting' };

/**
 * The ceremonies.
 *
 * Voting used to be one screen holding one hard-coded cycle. It is a list
 * now because an awards ceremony happens every year, and last year's — its
 * awards, its nominations, its result — is a record that should still be
 * openable rather than something a migration overwrote.
 */
export default async function VotingPage() {
  const editions = await loadEditionSummaries();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Trophy className="h-6 w-6" />
          Voting
        </h1>
        <p className="text-sm text-muted-foreground">
          Award ceremonies: the awards on offer, nominations from the membership, a shortlist drawn
          from them, and a weighted ballot. Results stay inside this dashboard.
        </p>
      </header>

      <CeremonyIndex editions={editions} />
    </section>
  );
}
