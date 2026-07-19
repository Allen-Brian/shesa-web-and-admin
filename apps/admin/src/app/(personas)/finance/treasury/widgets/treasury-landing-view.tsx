'use client';

import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { TreasuryCard } from './treasury-card';
import { TreasuryFiltersBar } from './treasury-filters-bar';
import { TreasuryRecentActivity } from './treasury-recent-activity';
import { TreasurySummaryStrip } from './treasury-summary-strip';
import {
  buildTreasuryLandingKpis,
  collectAvailableScopeTypes,
  filterAndSortTreasuries,
} from './treasury-landing-stats';
import type {
  RecentEntry,
  ScopeTypeFilter,
  SortKey,
  TreasuryEntry,
} from './treasury-landing-types';

interface Props {
  readonly treasuries: readonly TreasuryEntry[];
  readonly recentFeed: readonly RecentEntry[];
}

/**
 * Treasury landing — header + summary strip + filters + grid of
 * treasury cards + cross-treasury recent activity feed. Filter state
 * and derived stats live here; each rendered chunk is its own
 * sibling, so this file stays under the 200-line cap.
 */
export function TreasuryLandingView({ treasuries, recentFeed }: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [scopeType, setScopeType] = useState<ScopeTypeFilter>('all');

  const filtered = useMemo(
    () => filterAndSortTreasuries(treasuries, search, scopeType, sort),
    [treasuries, search, scopeType, sort],
  );
  const kpis = useMemo(() => buildTreasuryLandingKpis(treasuries), [treasuries]);
  const availableScopeTypes = useMemo(() => collectAvailableScopeTypes(treasuries), [treasuries]);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wallet className="h-6 w-6" />
          Treasury
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every finance-bearing scope you can see, with its live balance and 30-day flow. Click a
          treasury for its full statement (opening / income / expenses / closing) and the movements
          behind it.
        </p>
      </header>

      <TreasurySummaryStrip
        treasuryCount={kpis.treasuryCount}
        activeCount={kpis.activeCount}
        byCurrency={kpis.byCurrency}
      />

      <TreasuryFiltersBar
        search={search}
        onSearchChange={setSearch}
        scopeType={scopeType}
        onScopeTypeChange={setScopeType}
        sort={sort}
        onSortChange={setSort}
        availableScopeTypes={availableScopeTypes}
        filteredCount={filtered.length}
        totalCount={treasuries.length}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((t) => (
          <TreasuryCard key={t.scopeId} t={t} />
        ))}
      </div>

      {filtered.length === 0 && (
        <GradientPanel className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No treasuries match this filter. Clear the search or switch the scope type.
          </p>
        </GradientPanel>
      )}

      {recentFeed.length > 0 && <TreasuryRecentActivity entries={recentFeed} />}
    </section>
  );
}
