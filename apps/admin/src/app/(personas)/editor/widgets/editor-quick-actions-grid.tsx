import {
  CalendarDays,
  Crown,
  Images,
  Landmark,
  Music,
  Newspaper,
  Target,
  Trophy,
} from 'lucide-react';

import type { EditorContentKpis } from './dashboard-types';
import { EditorQuickActionCard } from './editor-quick-action-card';

/**
 * Quick-actions grid — one tile per editor surface. Hints double as
 * live totals so the operator sees which surface has content today
 * before clicking through. Icons + colours mirror the sidebar so the
 * dashboard reads as a portal home for the same sections.
 */
export function EditorQuickActionsGrid({ kpis }: { readonly kpis: EditorContentKpis }) {
  return (
    <div>
      <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Manage
      </span>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <EditorQuickActionCard
          href="/editor/news"
          icon={Newspaper}
          iconClass="bg-sky-500/15 text-sky-700 dark:text-sky-300"
          label="News"
          hint={`${kpis.articlesPublished} published · ${kpis.articlesDraft} draft`}
        />
        <EditorQuickActionCard
          href="/editor/site-events"
          icon={CalendarDays}
          iconClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          label="Site events"
          hint={
            kpis.siteEventsUpcoming > 0
              ? `${kpis.siteEventsUpcoming} upcoming`
              : `${kpis.siteEventsTotal} total`
          }
        />
        <EditorQuickActionCard
          href="/editor/projects"
          icon={Target}
          iconClass="bg-primary/10 text-primary"
          label="Projects"
          hint={`${kpis.projectsActive} active · ${kpis.projectsTotal} total`}
        />
        <EditorQuickActionCard
          href="/editor/gallery"
          icon={Images}
          iconClass="bg-amber-500/15 text-amber-700 dark:text-amber-400"
          label="Gallery"
          hint={`${kpis.galleryAlbums} album${kpis.galleryAlbums === 1 ? '' : 's'} · ${kpis.gallerySize} item${kpis.gallerySize === 1 ? '' : 's'}`}
        />
        <EditorQuickActionCard
          href="/editor/leadership"
          icon={Crown}
          iconClass="bg-violet-500/15 text-violet-700 dark:text-violet-400"
          label="Leadership"
          hint={`${kpis.totalLeaders} leader${kpis.totalLeaders === 1 ? '' : 's'} across tabs`}
        />
        <EditorQuickActionCard
          href="/editor/organs"
          icon={Landmark}
          iconClass="bg-sky-500/15 text-sky-700 dark:text-sky-300"
          label="Organs"
          hint={`${kpis.organs} organ${kpis.organs === 1 ? '' : 's'}`}
        />
        <EditorQuickActionCard
          href="/editor/songs"
          icon={Music}
          iconClass="bg-rose-500/15 text-rose-700 dark:text-rose-400"
          label="Songs"
          hint={`${kpis.songs} song${kpis.songs === 1 ? '' : 's'} in library`}
        />
        {/* No live count. The others read from the dashboard KPI query, and
            adding the awards schema to it would make every editor dashboard
            load pay for a cycle that runs for six weeks a year. */}
        <EditorQuickActionCard
          href="/editor/voting"
          icon={Trophy}
          iconClass="bg-amber-500/15 text-amber-700 dark:text-amber-400"
          label="Voting"
          hint="Leadership Awards"
        />
      </div>
    </div>
  );
}
