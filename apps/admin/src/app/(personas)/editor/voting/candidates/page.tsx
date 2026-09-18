import { Users } from 'lucide-react';

import { loadCandidates, loadVoting } from '../load-voting';
import { CandidatesBoard } from '../widgets/candidates-board';
import { VotingTabs } from '../widgets/voting-tabs';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Candidates' };

export default async function CandidatesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ award?: string }>;
}) {
  const [{ edition, awards, categories }, candidates, { award }] = await Promise.all([
    loadVoting(),
    loadCandidates(),
    searchParams,
  ]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Voting
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Users className="h-6 w-6" />
          The ballot
        </h1>
        <p className="text-sm text-muted-foreground">
          Who voters actually see. Most candidates arrive from the nominations screen; you can also
          add a name by hand. An award with nobody here is not shown to voters at all.
        </p>
      </header>

      <VotingTabs active="candidates" />

      {edition ? (
        <CandidatesBoard
          awards={awards}
          categories={categories}
          candidates={candidates}
          focusAwardId={award ?? null}
          phase={edition.phase}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No awards cycle exists yet.</p>
      )}
    </section>
  );
}
