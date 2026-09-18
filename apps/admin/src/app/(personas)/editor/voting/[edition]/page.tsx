import { notFound } from 'next/navigation';
import { clientEnv } from '@shesa/config/env.client';

import { loadCeremony, loadExcoPosts } from '../load-voting';
import { CeremonySwitcher } from '../widgets/ceremony-switcher';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ edition: string }>;
}) {
  const { edition } = await params;
  return { title: `Shesa Editor — ${edition}` };
}

/**
 * One ceremony.
 *
 * Two panels rather than one long page: Description is everything true of
 * the cycle as a whole — its dates, its links, its structure — and Awards is
 * the list you work through. They were stacked before, which meant scrolling
 * past the settings every time to reach the thing you came for.
 */
export default async function CeremonyPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ edition: string }>;
  readonly searchParams: Promise<{ tab?: string }>;
}) {
  const [{ edition: slug }, { tab }] = await Promise.all([params, searchParams]);

  const ceremony = await loadCeremony(slug);
  if (!ceremony) notFound();

  const excoPosts = await loadExcoPosts(ceremony.edition.id);

  return (
    <CeremonySwitcher
      edition={ceremony.edition}
      categories={ceremony.categories}
      awards={ceremony.awards}
      totals={ceremony.totals}
      excoPosts={excoPosts}
      webBaseUrl={clientEnv.NEXT_PUBLIC_WEB_APP_URL}
      // Awards is the default: the description is read once when the cycle
      // is set up, and the awards are what is opened every day after that.
      tab={tab === 'description' ? 'description' : 'awards'}
    />
  );
}
