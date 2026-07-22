'use client';

import { Building2, GraduationCap } from 'lucide-react';

import { StatsCard } from '@shesa/ui';

import { formatCompactMoney, formatMoney } from '@/lib/finance/format-money';

import type { ChargeTargetPlanRow } from './charge-detail-types';

interface ChargeTargetsPlanCardProps {
  readonly chargeTargets: readonly ChargeTargetPlanRow[];
  readonly currency: string;
}

/**
 * Plan-reference card for Group charges — lists the configured
 * `finance.charge_targets` rows with per-target amounts. Always
 * visible so a draft (no obligations yet) still shows the operator
 * the plan; once obligations exist, the matrix below adds the
 * paid/outstanding roll-up per target.
 */
export function ChargeTargetsPlanCard({ chargeTargets, currency }: ChargeTargetsPlanCardProps) {
  if (chargeTargets.length === 0) return null;
  const total = chargeTargets.reduce((acc, t) => acc + t.amount, 0);

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">Target plan</h2>
          <p className="text-xs text-muted-foreground">
            {chargeTargets.length} target{chargeTargets.length === 1 ? '' : 's'} · amounts frozen at
            charge creation.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard label="Targets" value={chargeTargets.length.toLocaleString()} />
        <StatsCard label="Planned total" value={formatCompactMoney(total, currency)} />
        <StatsCard
          label="Average per target"
          value={formatCompactMoney(total / chargeTargets.length, currency)}
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 text-left">Target</th>
              <th className="px-3 py-1.5 text-left">Kind</th>
              <th className="w-32 px-3 py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {chargeTargets.map((t) => {
              const Icon = t.scopeType === 'batch' ? GraduationCap : Building2;
              return (
                <tr key={t.targetScopeId}>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      <span className="truncate font-medium">{t.targetName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 uppercase tracking-wider text-[10px] text-muted-foreground">
                    {t.scopeType}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoney(t.amount, t.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
