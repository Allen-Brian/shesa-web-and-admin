'use client';

import { useState, useTransition } from 'react';

import { toast } from '@shesa/ui';

import { runReport, type ReportKey } from '../report-actions';
import {
  PRESETS,
  REPORTS,
  type GroupOption,
  type Preset,
  type ResultRow,
  type RunResult,
} from './reports-types';
import { windowFor } from './reports-window';

interface RunReportInput {
  readonly reportKey: ReportKey;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly preset: Preset;
  readonly customFrom: string;
  readonly customTo: string;
  /** When set, returned rows are narrowed to charges in this group. */
  readonly group: GroupOption | null;
}

/**
 * Owns the "run report" flow: pending flag, latest result, and the
 * server-action call itself. Keeps the orchestrator layout-focused
 * and gives the run button a single stable handler prop. When a
 * group is picked, rows carrying a `charge_id` field are filtered
 * to the group's charges after the RPC returns — the reporting
 * fns stay scope-native (module 8 non-goal).
 */
export function useRunReport() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RunResult | null>(null);

  const run = (input: RunReportInput) => {
    if (!input.scopeId) {
      toast.error('Pick a scope.');
      return;
    }
    const currentReport = REPORTS.find((r) => r.value === input.reportKey);
    const { from, to } = windowFor(input.preset, input.customFrom, input.customTo);
    startTransition(async () => {
      const res = await runReport({
        reportKey: input.reportKey,
        scopeId: input.scopeId,
        from: currentReport?.usesDates && from ? from : null,
        to: currentReport?.usesDates && to ? to : null,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const rawRows = res.data.rows as unknown as ReadonlyArray<{ charge_id?: string }>;
      const narrowed = input.group
        ? narrowRowsByGroup(rawRows, new Set(input.group.chargeIds))
        : rawRows;
      const tagged = narrowed.map((r) => ({
        ...(r as unknown as Record<string, unknown>),
        __report: res.data.report,
      })) as unknown as ResultRow[];
      const windowLabel = currentReport?.usesDates
        ? input.preset === 'custom'
          ? `${input.customFrom || 'beginning'} → ${input.customTo}`
          : (PRESETS.find((p) => p.key === input.preset)?.label ?? input.preset)
        : 'point-in-time';
      setResult({
        report: res.data.report,
        rows: tagged,
        ranAt: new Date().toISOString(),
        scopeName: input.scopeName,
        windowLabel,
        groupName: input.group?.name ?? null,
      });
    });
  };

  return { pending, result, run };
}

/**
 * Keep only rows whose `charge_id` belongs to the picked group.
 * Reports that don't have a `charge_id` (treasury_statement,
 * payment_method_breakdown, expense_report_by_category) pass through
 * unchanged — narrowing them meaningfully needs the SQL-level group
 * awareness that module 8 explicitly defers.
 */
function narrowRowsByGroup<Row extends { charge_id?: string }>(
  rows: ReadonlyArray<Row>,
  chargeIds: ReadonlySet<string>,
): Row[] {
  return rows.filter((r) => {
    if (!r.charge_id) return true;
    return chargeIds.has(r.charge_id);
  });
}
