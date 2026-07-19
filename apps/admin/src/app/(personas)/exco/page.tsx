import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { computeDashboardAnalytics } from './dashboard-analytics';
import { loadDashboardRawData } from './dashboard-data-loader';
import { detectDashboardPersona } from './dashboard-persona';
import { buildDashboardScopeContext } from './dashboard-scope-context';
import { computeDashboardStats } from './dashboard-stats';
import { computeDashboardWidgetData } from './dashboard-widget-data';
import { ExcoDashboardView, type DashboardProps } from './widgets/dashboard-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — Dashboard' };

/**
 * Exco Dashboard — the entry-point for the /exco persona.
 *
 * Persona lens:
 *   - Global Admin (mainstream_admin at NULL scope): federation-wide
 *     view — every branch, chapter, member, event, charge.
 *   - Branch / Autonomous-chapter admin: filtered to their own scope(s).
 *     A single "myScopes" set drives every widget's filter.
 *
 * This page is a thin orchestrator over five sibling data-derivation
 * modules (persona, loader, scope context, stats, widget data,
 * analytics). Each module owns one concern and returns the exact shape
 * the DashboardView widget expects.
 */
export default async function ExcoDashboardPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco');

  const persona = await detectDashboardPersona(supabase, user.id);
  const raw = await loadDashboardRawData(supabase);
  const context = buildDashboardScopeContext(raw, persona);

  // Scoped-admin's primary branch (used for percent-acquisition + label).
  let firstScopeName: string | null = null;
  const firstScope = persona.isGlobalAdmin
    ? null
    : (raw.scopes.find((s) => persona.myScopeIds.includes(s.id)) ?? null);
  const firstBranch = firstScope
    ? (raw.branches.find((b) => b.scope_id === firstScope.id) ?? null)
    : null;
  if (firstScope) firstScopeName = firstScope.name;

  const { stats } = computeDashboardStats({ raw, persona, context, firstBranch });
  const widgetData = computeDashboardWidgetData({ raw, persona, context });
  const analytics = computeDashboardAnalytics({ raw, context });

  const props: DashboardProps = {
    isGlobalAdmin: persona.isGlobalAdmin,
    scopeLabel: persona.isGlobalAdmin ? 'Federation' : (firstScopeName ?? 'Your scope'),
    stats,
    contributions: widgetData.contributions,
    upcomingEvents: widgetData.upcomingEvents,
    announcements: widgetData.announcements,
    topMembers: widgetData.topMembers,
    calendarEvents: widgetData.calendarEvents,
    chargesCompletion: widgetData.chargesCompletion,
    latestTransactions: widgetData.latestTransactions,
    analytics,
    userName: (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'there',
  };

  return <ExcoDashboardView {...props} />;
}
