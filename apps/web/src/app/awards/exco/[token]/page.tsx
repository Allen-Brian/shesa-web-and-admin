import type { Metadata } from 'next';

import { BallotPage } from '@/components/awards/ballot-page';

/**
 * The Executive Committee's ballot.
 *
 * Reachable only by holding the token. It is linked from no page, is absent
 * from the sitemap, and `robots.ts` disallows `/awards/exco/`; `noindex,
 * nofollow` here is the third of those, for crawlers that arrive at the URL
 * directly rather than reading robots.txt first.
 *
 * The token is never trusted as a claim — it is passed to the database,
 * which decides whether it is the current one and therefore what weight the
 * ballot carries. A stale token renders a refusal, not a public ballot,
 * because someone sent here deliberately needs to know their link is dead
 * rather than silently cast a vote at the wrong weight.
 */
export const metadata: Metadata = {
  title: 'Executive Committee Ballot',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function ExcoVotePage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <BallotPage excoToken={token} />;
}
