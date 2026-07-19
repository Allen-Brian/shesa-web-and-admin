'use client';

import { useState, useTransition } from 'react';

import { toast } from '@shesa/ui';

import { runReport, type ReportKey } from '../actions';
import { PRESETS, REPORTS, type Preset, type ResultRow, type RunResult } from './reports-types';
import { windowFor } from './reports-window';

interface RunReportInput {
  readonly reportKey: ReportKey;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly preset: Preset;
  readonly customFrom: string;
  readonly customTo: string;
}

/**
 * Owns the "run report" flow: pending flag, latest result, and the
 * server-action call itself. Keeps the orchestrator layout-focused
 * and gives the run button a single stable handler prop.
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
      const tagged = res.data.rows.map((r) => ({
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
      });
    });
  };

  return { pending, result, run };
}
