import Link from 'next/link';

import type { AwardsEdition } from '@/lib/awards';

/** WAT. Every deadline SHESA publishes is in it, so every date here is too. */
const WAT = 'Africa/Lagos';

export function formatWat(iso: string | null, withTime = false): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: WAT,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/**
 * The line under the title, which is the only part of this page that has
 * to change five times. Each phase says the same two things: where the
 * cycle is, and what the reader can do about it right now.
 */
function standing(edition: AwardsEdition): { kicker: string; line: string } {
  switch (edition.phase) {
    case 'nominating':
      return {
        kicker: 'Nominations are open',
        line: `Put a name forward until ${formatWat(edition.nominationsCloseAt)}. Voting opens ${formatWat(edition.votingOpenAt)}.`,
      };
    case 'review':
      return {
        kicker: 'Nominations have closed',
        line: `The secretariat is reviewing every name put forward. Voting opens ${formatWat(edition.votingOpenAt)}.`,
      };
    case 'voting':
      return {
        kicker: 'Voting is open',
        line: `Ballots close ${formatWat(edition.votingCloseAt)}. Results are presented at the AGM.`,
      };
    case 'closed':
      return {
        kicker: 'Voting has closed',
        line: 'The results will be presented at the Annual General Meeting.',
      };
    default:
      return {
        kicker: 'Opening soon',
        line: edition.nominationsOpenAt
          ? `Nominations open ${formatWat(edition.nominationsOpenAt)}.`
          : 'Nominations open shortly.',
      };
  }
}

export function AwardsHero({ edition }: { readonly edition: AwardsEdition }) {
  const { kicker, line } = standing(edition);

  return (
    <section className="relative overflow-hidden bg-[#08080c] pb-20 pt-36 text-white md:pb-28 md:pt-44">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(90% 60% at 20% 0%, rgba(139,21,51,0.35) 0%, rgba(8,8,12,0) 70%)',
        }}
      />

      <div className="relative mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <p
          className="font-heading text-[11px] font-semibold uppercase text-primary"
          style={{ letterSpacing: '0.34em' }}
        >
          {kicker}
        </p>

        <h1
          className="mt-5 max-w-4xl font-heading font-thin leading-[1.03] text-white"
          style={{ fontSize: 'clamp(2.25rem, 6vw, 4.75rem)', letterSpacing: '-0.025em' }}
        >
          {edition.name}
        </h1>

        {edition.description && (
          <p className="mt-7 max-w-2xl text-[15.5px] leading-[1.8] text-white/65 md:text-[17px]">
            {edition.description}
          </p>
        )}

        <p className="mt-6 max-w-2xl text-[14px] leading-[1.75] text-white/45">{line}</p>

        {/* One call to action, and which one depends on the phase. Only the
            public ballot is ever linked — the Exco door is reachable by its
            token alone and appears nowhere on the site. */}
        {(edition.phase === 'nominating' || edition.phase === 'voting') && (
          <Link
            href={edition.phase === 'voting' ? '/awards/vote' : '#nominate'}
            className="group mt-10 inline-flex items-center gap-3 rounded-xs bg-primary px-7 py-4 text-sm font-medium tracking-wide text-white shadow-[0_24px_70px_-18px_rgba(139,21,51,0.8)] transition-transform duration-500 hover:-translate-y-0.5"
          >
            {edition.phase === 'voting' ? 'Cast your vote' : 'Nominate someone'}
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
