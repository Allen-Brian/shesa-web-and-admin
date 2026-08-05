import { GradientPanel } from '@shesa/ui';

import type { EditorContentKpis } from './dashboard-types';

/**
 * Compact secondary stats card — the numbers that don't warrant a
 * headline KPI tile but that Editors still want to see when they land
 * on the dashboard (drafts in flight, gallery items, songs, organs).
 */
export function EditorContentStats({ kpis }: { readonly kpis: EditorContentKpis }) {
  const rows: readonly { label: string; value: string }[] = [
    { label: 'Articles in draft', value: kpis.articlesDraft.toLocaleString() },
    { label: 'Total published articles', value: kpis.articlesPublished.toLocaleString() },
    { label: 'Site events total', value: kpis.siteEventsTotal.toLocaleString() },
    { label: 'Projects total', value: kpis.projectsTotal.toLocaleString() },
    { label: 'Gallery items', value: kpis.gallerySize.toLocaleString() },
    { label: 'Songs', value: kpis.songs.toLocaleString() },
    { label: 'Organs', value: kpis.organs.toLocaleString() },
  ];
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <span className="text-sm font-semibold text-foreground">Content library</span>
      <ul className="flex flex-col divide-y divide-border/50 text-sm">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-medium text-foreground tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </GradientPanel>
  );
}
