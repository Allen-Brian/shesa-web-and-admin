import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Network } from 'lucide-react';

import { loadEditorOrgans } from '../../load-organs';
import { OrganForm } from '../../widgets/organ-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Edit organ' };

interface Params {
  readonly params: Promise<{ id: string }>;
}

/** Edit-organ page for the Editor persona. */
export default async function EditOrganPage({ params }: Params) {
  const { id } = await params;
  const { organs, sectors, albums } = await loadEditorOrgans();
  const organ = organs.find((o) => o.id === id);
  if (!organ) notFound();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          href="/editor/organs"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Organs
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Network className="h-6 w-6" />
          Edit organ
        </h1>
        <p className="text-xs text-muted-foreground">{organ.name}</p>
      </div>

      <OrganForm sectors={sectors} editing={organ} albums={albums} />
    </section>
  );
}
