import { Home } from 'lucide-react';

import { loadEditorDashboard } from './widgets/dashboard-loader';
import { EditorContentStats } from './widgets/editor-content-stats';
import { EditorFeaturedPanel } from './widgets/editor-featured-panel';
import { EditorHeroKpis } from './widgets/editor-hero-kpis';
import { EditorQuickActionsGrid } from './widgets/editor-quick-actions-grid';
import { EditorRecentArticles } from './widgets/editor-recent-articles';
import { EditorUpcomingEvents } from './widgets/editor-upcoming-events';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Dashboard' };

/**
 * Editor dashboard — the persona's landing. Portfolio KPI strip on
 * top, quick-actions grid to jump straight into any editor surface,
 * then a two-column body with the two most-referenced lists
 * (recent articles + upcoming site events) on the left and
 * featured-content + library-count reference cards on the right.
 */
export default async function EditorDashboardPage() {
  const { kpis, recentArticles, upcomingEvents, featured } = await loadEditorDashboard();

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Editor
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Home className="h-6 w-6" />
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Everything you publish on the public site — leadership, news, events, projects, gallery,
          organs, songs — at a glance.
        </p>
      </header>

      <EditorHeroKpis kpis={kpis} />

      <EditorQuickActionsGrid kpis={kpis} />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <EditorRecentArticles articles={recentArticles} />
          <EditorUpcomingEvents events={upcomingEvents} />
        </div>
        <div className="flex flex-col gap-4">
          <EditorFeaturedPanel items={featured} />
          <EditorContentStats kpis={kpis} />
        </div>
      </div>
    </section>
  );
}
