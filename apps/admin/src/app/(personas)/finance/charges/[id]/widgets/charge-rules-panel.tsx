'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';

import { Button, GradientPanel, toast } from '@shesa/ui';

import { removeRule } from '../charge-detail-actions';
import type { ChargeRulesData, RuleForm } from './charge-detail-types';
import { ChargeRuleDialog } from './charge-rule-dialog';

const FORM_LABEL: Record<RuleForm, string> = {
  fixed: 'Batch tier',
  relative: 'Recent leavers',
  senior: 'Seniors',
  individual: 'Individual',
};

/**
 * Member-rules panel for an individual charge. Lists the active rules
 * (batch tiers, exit-year exemptions, senior discounts, individual
 * overrides) and hosts the add dialog. Rules resolve highest-priority-
 * first with no stacking, and a change takes effect from the next
 * period — the panel says so up front so the operator isn't surprised
 * the current month didn't move.
 */
export function ChargeRulesPanel({
  chargeId,
  data,
}: {
  readonly chargeId: string;
  readonly data: ChargeRulesData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  const onRemove = (id: string) => {
    startTransition(async () => {
      const res = await removeRule(id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Rule removed — future periods stop matching it.');
      router.refresh();
    });
  };

  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Member rules
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add rule
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Make different members pay different amounts. Highest-priority rule wins (individual &gt;
        exit-year &gt; batch) — no stacking. Changes take effect next period.
      </p>

      {data.rules.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          No rules yet — every member pays the base amount.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {data.rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {FORM_LABEL[r.form]}
                </span>
                <span className="truncate text-foreground">{r.description}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(r.id)}
                loading={pending}
                disabled={pending}
                aria-label="Remove rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ChargeRuleDialog
        open={adding}
        onClose={() => setAdding(false)}
        chargeId={chargeId}
        data={data}
      />
    </GradientPanel>
  );
}
