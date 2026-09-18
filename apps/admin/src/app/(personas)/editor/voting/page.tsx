import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { StatsCard } from '@shesa/ui';
import { clientEnv } from '@shesa/config/env.client';

import { loadVoting } from './load-voting';
import { AwardStructure } from './widgets/award-structure';
import { EditionWindows } from './widgets/edition-windows';
import { PhaseBanner } from './widgets/phase-banner';
import { VotingLinks } from './widgets/voting-links';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Voting' };

/**
 * The Voting overview.
 *
 * The order down the page follows the order of the work: where the cycle is,
 * the links you hand out, what shape the awards are in, then the dates that
 * move it along.
 */
export default async function EditorVotingPage() {
  const { edition, categories, awards } = await loadVoting();

  if (!edition) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-5">
        <Header />
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No awards cycle has been created yet. One is added by migration so the approved
            categories and deadlines are recorded in the repository rather than typed into a form —
            ask an engineer to add it.
          </p>
        </div>
      </section>
    );
  }

  const totalNominations = awards.reduce((n, a) => n + a.nominationCount, 0);
  const pending = awards.reduce((n, a) => n + a.pendingCount, 0);
  const onBallot = awards.reduce((n, a) => n + a.candidateCount, 0);
  const emptyAwards = awards.filter((a) => a.status === 'active' && a.candidateCount === 0).length;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <Header />

      <PhaseBanner edition={edition} />

      <div className="flex flex-wrap gap-3">
        <StatsCard label="Nominations received" value={totalNominations} />
        <StatsCard label="Awaiting review" value={pending} />
        <StatsCard label="On the ballot" value={onBallot} />
        <StatsCard label="Awards with nobody" value={emptyAwards} />
      </div>

      {/* The one number that is a problem rather than a fact. An award with
          no candidate vanishes from the public ballot, and finding that out
          from a voter is worse than finding it out here. */}
      {emptyAwards > 0 && edition.phase !== 'nominating' && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-foreground">
            {emptyAwards} {emptyAwards === 1 ? 'award has' : 'awards have'} nobody on the ballot.
          </p>
          <p className="mt-1 text-muted-foreground">
            An award with no candidates is not shown to voters at all.{' '}
            <Link href="/editor/voting/nominations" className="text-primary hover:underline">
              Draw the shortlist from the nominations
            </Link>
            , or add candidates by hand.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">The two links</h2>
        <VotingLinks
          slug={edition.slug}
          excoToken={edition.excoToken}
          editionId={edition.id}
          webBaseUrl={clientEnv.NEXT_PUBLIC_WEB_APP_URL}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">The awards</h2>
        <AwardStructure categories={categories} awards={awards} phase={edition.phase} />
      </div>

      <EditionWindows edition={edition} />
    </section>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-1">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Content
      </div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
        <Trophy className="h-6 w-6" />
        Voting
      </h1>
      <p className="text-sm text-muted-foreground">
        The SHESA Leadership Awards: nominations from the membership, a shortlist drawn from them,
        and a weighted ballot. Results stay inside this dashboard.
      </p>
    </header>
  );
}
