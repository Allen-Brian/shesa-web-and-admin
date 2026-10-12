import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AwardsBoard } from '@/components/awards/awards-board';
import { AwardsHero, formatWat } from '@/components/awards/awards-hero';
import { NominationFlow } from '@/components/awards/nomination-flow';
import { PartnersBillboard } from '@/components/home/partners-billboard';
import { getAwardsState, getBranchOptions } from '@/lib/awards';

export const metadata: Metadata = {
  title: 'Leadership Awards · Nominate',
  description:
    'The SHESA Leadership Awards 2026. Nominate the ex-students, branches and chapters whose work deserves recognition at the AGM.',
  alternates: { canonical: '/awards' },
  openGraph: {
    title: 'SHESA Leadership Awards 2026',
    description:
      'Nominations are open. Put forward the ex-students, branches and chapters whose work deserves recognition at AGM 2026.',
    url: '/awards',
    type: 'website',
  },
};

/**
 * Cached for a minute, not statically rendered. The page's whole shape
 * turns on `awards.phase()`, which is a function of the clock: a build-time
 * render would still be advertising nominations the morning after they
 * shut.
 */
export const revalidate = 60;

export default async function AwardsPage() {
  const state = await getAwardsState();

  // No cycle in the database is not an error state to explain — there is
  // simply no page yet.
  if (!state.edition) notFound();

  const open = state.edition.phase === 'nominating';
  const branches = open ? await getBranchOptions() : [];

  return (
    <>
      <AwardsHero edition={state.edition} />
      <AwardsBoard categories={state.categories} awards={state.awards} />

      <section id="nominate" className="scroll-mt-24 bg-black/2 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          {open ? (
            <>
              <div className="mb-10 text-center">
                <p className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary">
                  Nominate
                </p>
                <h2
                  className="mt-4 font-heading font-thin leading-[1.08] text-black"
                  style={{ fontSize: 'clamp(1.75rem, 3.8vw, 3rem)', letterSpacing: '-0.02em' }}
                >
                  Three questions. Under a minute.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-[14.5px] leading-[1.75] text-black/55">
                  Nominations close {formatWat(state.edition.nominationsCloseAt)}. You can nominate
                  for as many awards as you like.
                </p>
              </div>

              <NominationFlow
                awards={state.awards}
                categories={state.categories}
                branches={branches}
              />
            </>
          ) : (
            <ClosedNotice edition={state.edition} />
          )}
        </div>
      </section>

      <PartnersBillboard />
    </>
  );
}

/** Every phase but `nominating` lands here — the form is simply not drawn. */
function ClosedNotice({
  edition,
}: {
  readonly edition: Awaited<ReturnType<typeof getAwardsState>>['edition'];
}) {
  if (!edition) return null;

  const [title, body] =
    edition.phase === 'upcoming'
      ? [
          'Nominations open shortly.',
          edition.nominationsOpenAt
            ? `Come back on ${formatWat(edition.nominationsOpenAt)} to put a name forward.`
            : 'Come back shortly to put a name forward.',
        ]
      : edition.phase === 'review'
        ? [
            'Nominations have closed.',
            `Thank you. The secretariat is reviewing every name put forward, and voting opens ${formatWat(edition.votingOpenAt)}.`,
          ]
        : edition.phase === 'voting'
          ? [
              'Voting is under way.',
              `The shortlist is drawn and ballots close ${formatWat(edition.votingCloseAt)}.`,
            ]
          : [
              'This cycle has closed.',
              'The results will be presented at the Annual General Meeting.',
            ];

  return (
    <div className="rounded-xs border border-black/10 bg-white px-6 py-16 text-center md:px-12 md:py-20">
      <h2
        className="font-heading font-thin leading-[1.1] text-black"
        style={{ fontSize: 'clamp(1.7rem, 3.6vw, 2.6rem)', letterSpacing: '-0.02em' }}
      >
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-[1.75] text-black/55">{body}</p>
    </div>
  );
}
