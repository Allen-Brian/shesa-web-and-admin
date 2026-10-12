import Link from 'next/link';

import { getBallotPaper, getBranchOptions } from '@/lib/awards';

import { formatWat } from './awards-hero';
import { BallotFlow } from './ballot-flow';

/**
 * The page both doors render.
 *
 * Public and Exco differ in exactly two things — the token in the URL and
 * what the database says that token means — so they share everything else.
 * Two hand-maintained copies of a ballot is how the two colleges end up
 * voting on different lists.
 */
export async function BallotPage({ excoToken }: { readonly excoToken?: string }) {
  const paper = await getBallotPaper(undefined, excoToken);

  if (paper.publicOnly) {
    return (
      <Shell title="This ceremony has no Exco ballot.">
        It is decided by the membership alone, so every vote counts the same and there is no
        separate Executive Committee link. Use the public voting link — a ballot cast there is
        counted in full.
      </Shell>
    );
  }

  if (paper.invalidToken) {
    return (
      <Shell title="That link is no longer valid.">
        The Executive Committee&apos;s voting link has been reissued, or this one was mistyped. Ask
        the secretariat for the current link rather than voting through the public one — a ballot
        cast there is counted at the ex-student weight and cannot be moved afterwards.
      </Shell>
    );
  }

  if (!paper.edition) {
    return (
      <Shell title="There is no ballot here.">No awards cycle is running at the moment.</Shell>
    );
  }

  const { phase } = paper.edition;

  if (phase !== 'voting') {
    return (
      <Shell
        title={
          phase === 'closed'
            ? 'Voting has closed.'
            : phase === 'upcoming' || phase === 'nominating' || phase === 'review'
              ? 'Voting has not opened yet.'
              : 'Voting is not open.'
        }
      >
        {phase === 'closed' ? (
          <>The results will be presented at the Annual General Meeting.</>
        ) : (
          <>
            Ballots open {formatWat(paper.edition.votingOpenAt)}.{' '}
            {phase === 'nominating' && (
              <>
                Until then you can{' '}
                <Link href="/awards" className="text-primary underline-offset-4 hover:underline">
                  put a name forward
                </Link>
                .
              </>
            )}
          </>
        )}
      </Shell>
    );
  }

  if (paper.awards.length === 0) {
    return (
      <Shell title="The ballot is not ready.">
        Voting is open but no candidates have been published yet. Please check back shortly.
      </Shell>
    );
  }

  const branches = await getBranchOptions();

  return (
    <main className="bg-black/2 pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="mx-auto max-w-4xl px-5 md:px-8">
        <div className="mb-10">
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">
            {paper.college === 'exco' ? 'Executive Committee ballot' : 'Voting is open'}
          </p>
          <h1
            className="mt-5 font-heading font-thin leading-[1.05] text-black"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', letterSpacing: '-0.025em' }}
          >
            {paper.edition.name}
          </h1>
          <p className="mt-5 max-w-2xl text-[14.5px] leading-[1.75] text-black/55">
            {paper.awards.length} {paper.awards.length === 1 ? 'award' : 'awards'} on the ballot.
            Voting closes {formatWat(paper.edition.votingCloseAt)}. One ballot per device.
          </p>
        </div>

        <BallotFlow paper={paper} branches={branches} excoToken={excoToken} />
      </div>
    </main>
  );
}

function Shell({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <main className="bg-black/2 pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="mx-auto max-w-2xl px-5 md:px-8">
        <div className="rounded-xs border border-black/10 bg-white px-6 py-16 text-center md:px-12 md:py-20">
          <h1
            className="font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.7rem, 3.8vw, 2.75rem)', letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[14.5px] leading-[1.8] text-black/55">
            {children}
          </p>
          <Link
            href="/awards"
            className="mt-9 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-black/50 transition-colors hover:text-primary"
          >
            <span aria-hidden>←</span> The awards
          </Link>
        </div>
      </div>
    </main>
  );
}
