'use client';

import { useMemo } from 'react';

import { StatsCard } from '@shesa/ui';

import type { ChargeRow } from './exco-charge-widget-types';

/**
 * Four at-a-glance counters — total / active / draft / archived —
 * mirroring the layout convention used on Obligations + Contributions
 * so a branch admin scanning across the finance surfaces sees a
 * consistent shape.
 */
export function ChargesKpiStrip({ rows }: { readonly rows: readonly ChargeRow[] }) {
  const kpis = useMemo(() => {
    const total = rows.length;
    let active = 0;
    let draft = 0;
    let archived = 0;
    for (const r of rows) {
      if (r.status === 'active') active += 1;
      else if (r.status === 'draft') draft += 1;
      else if (r.status === 'archived') archived += 1;
    }
    return { total, active, draft, archived };
  }, [rows]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard label="Total charges" value={kpis.total} />
      <StatsCard label="Active" value={kpis.active} />
      <StatsCard label="Draft" value={kpis.draft} />
      <StatsCard label="Archived" value={kpis.archived} />
    </div>
  );
}
