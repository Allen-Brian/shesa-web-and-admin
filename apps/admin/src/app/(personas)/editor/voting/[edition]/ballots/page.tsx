import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ScrollText } from 'lucide-react';

import { loadBallots, loadEditionBySlug } from '../../load-voting';
import { BallotRegister } from '../../widgets/ballot-register';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Ballots' };

export default async function BallotsPage({
  params,
}: {
  readonly params: Promise<{ edition: string }>;
}) {
  const { edition: slug } = await params;
  const edition = await loadEditionBySlug(slug);
  if (!edition) notFound();

  const ballots = await loadBallots(edition.id);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={`/editor/voting/${edition.slug}`}
          className="w-fit text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          ← {edition.name}
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <ScrollText className="h-6 w-6" />
          Ballots
        </h1>
        <p className="text-sm text-muted-foreground">
          Who voted, not how. Exco ballots carry a post and a name so you can recognise one that
          should not be there; voiding strikes a ballot from the tally without deleting it.
        </p>
      </header>

      <BallotRegister ballots={ballots} />
    </section>
  );
}
