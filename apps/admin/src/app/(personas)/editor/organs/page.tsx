import { Network } from 'lucide-react';

import { loadEditorOrgans } from './load-organs';
import { OrgansListView } from './widgets/organs-list-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Organs' };

/** Organs list page for the Editor persona. */
export default async function EditorOrgansPage() {
  const { organs, sectors } = await loadEditorOrgans();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Network className="h-6 w-6" />
          Organs
        </h1>
        <p className="text-sm text-muted-foreground">
          The SHESA structure — National body, regional sectors, and every branch/chapter. Sectors
          are pure groupings; delete rules and public order all flow from this list.
        </p>
      </header>

      <OrgansListView organs={organs} sectors={sectors} />
    </section>
  );
}
