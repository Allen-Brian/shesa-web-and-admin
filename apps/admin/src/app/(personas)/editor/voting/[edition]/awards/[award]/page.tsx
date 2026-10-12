import { notFound } from 'next/navigation';

import { loadAward } from '../../../load-voting';
import { AwardWorkspaceView } from '../../../widgets/award-workspace';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ edition: string; award: string }>;
}) {
  const { edition, award } = await params;
  const loaded = await loadAward(edition, award);
  return { title: `Shesa Editor — ${loaded?.award.name ?? 'Award'}` };
}

/**
 * One award, end to end.
 *
 * Nominations, the nominees they group into, and the ballot — three views of
 * the same pile, in the order the work happens. Scoped to one award because
 * that is the unit the decision is made in: never "review the nominations",
 * always "who should be on the ballot for Health".
 */
export default async function AwardPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ edition: string; award: string }>;
  readonly searchParams: Promise<{ tab?: string }>;
}) {
  const [{ edition, award }, { tab }] = await Promise.all([params, searchParams]);

  const loaded = await loadAward(edition, award);
  if (!loaded) notFound();

  const valid = tab === 'nominations' || tab === 'nominees' || tab === 'ballot';

  return (
    <AwardWorkspaceView
      workspace={loaded}
      // Nominees is the default: it is the screen that answers the question
      // people open an award to ask, which is who leads it.
      tab={valid ? (tab as 'nominations' | 'nominees' | 'ballot') : 'nominees'}
    />
  );
}
