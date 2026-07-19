import { redirect } from 'next/navigation';
import { Wallet } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

import { loadFinanceDashboard } from './widgets/dashboard-loader';
import { FinanceHeroKpis } from './widgets/hero-kpis';
import { PendingApprovalsPanel } from './widgets/pending-approvals-panel';
import { QuickActionsGrid } from './widgets/quick-actions-grid';
import { RecentActivityPanel } from './widgets/recent-activity-panel';
import { TopTreasuriesPanel } from './widgets/top-treasuries-panel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shesa Finance — Dashboard',
};

/**
 * Finance dashboard — the persona's landing.
 *
 * Organised as an operational triage view rather than a data
 * explorer: hero KPIs surface treasury balances + 30-day flow, quick
 * actions jump straight into the mainline mutation flows, then two
 * side-by-side panels highlight top treasuries and pending approvals
 * so nothing slips off the operator's radar. Data loading + all
 * reduce logic lives in `loadFinanceDashboard`; each section is its
 * own sibling widget.
 *
 * RLS on the finance schema does the visibility work: SELECT filters
 * to scopes the caller holds `finance.read` at. That gate lives in
 * the migration layer, not here.
 */
export default async function FinanceDashboardPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance');

  const { treasuries, topTreasuries, pendingExpenses, pendingSummary, scopeById, kpis, activity } =
    await loadFinanceDashboard();

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wallet className="h-6 w-6" />
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {treasuries.length === 0
            ? 'No treasuries are visible to you yet.'
            : `${treasuries.length} treasur${treasuries.length === 1 ? 'y' : 'ies'} in view · financial pulse for the last 30 days.`}
        </p>
      </header>

      <FinanceHeroKpis kpis={kpis} />

      <QuickActionsGrid pendingCount={pendingSummary.count} />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <TopTreasuriesPanel treasuries={topTreasuries} scopeById={scopeById} />
        <PendingApprovalsPanel
          summary={pendingSummary}
          pendingExpenses={pendingExpenses}
          scopeById={scopeById}
        />
      </div>

      <RecentActivityPanel activity={activity} />
    </section>
  );
}
