import { StatsCard } from '@shesa/ui';

import type { EditorContentKpis } from './dashboard-types';

/**
 * Headline KPI strip — 5 tiles summarising the editor's portfolio at a
 * glance. Numbers reflect the actual CMS row counts, not aspirational
 * targets. Articles split into published / draft because the split is
 * the operator's most-answered question ("what's in flight vs. live?").
 */
export function EditorHeroKpis({ kpis }: { readonly kpis: EditorContentKpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard label="Leaders" value={kpis.totalLeaders.toLocaleString()} />
      <StatsCard label="Articles" value={kpis.articlesTotal.toLocaleString()} />
      <StatsCard label="Site events" value={kpis.siteEventsUpcoming.toLocaleString()} />
      <StatsCard label="Projects" value={kpis.projectsActive.toLocaleString()} />
      <StatsCard label="Gallery" value={kpis.galleryAlbums.toLocaleString()} />
    </div>
  );
}
