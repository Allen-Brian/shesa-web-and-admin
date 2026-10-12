'use client';

import { useMemo, useState } from 'react';
import { BarChart } from 'lucide-react';

import type { ReportKey } from '../report-actions';
import { ReportCataloguePicker } from './report-catalogue-picker';
import { ReportControlsCard } from './report-controls-card';
import { ReportResultPanel } from './report-result-panel';
import { PRESETS, REPORTS, type GroupOption, type Preset, type ScopeOption } from './reports-types';
import { useRunReport } from './use-run-report';

interface ReportsViewProps {
  readonly scopeOptions: readonly ScopeOption[];
  readonly groupOptions: readonly GroupOption[];
}

/**
 * Reports view — pick a report, pick a scope, optionally narrow to a
 * group, pick a window, run. Every rendered chunk (catalogue picker,
 * run controls, result panel) lives in its own sibling; this file
 * wires state + the run-report hook.
 */
export function ReportsView({ scopeOptions, groupOptions }: ReportsViewProps) {
  const [reportKey, setReportKey] = useState<ReportKey>('collections');
  const [scopeId, setScopeId] = useState<string>(scopeOptions[0]?.id ?? '');
  const [groupId, setGroupId] = useState<string>('');
  const [preset, setPreset] = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>(new Date().toISOString().slice(0, 10));

  const currentReport = useMemo(() => REPORTS.find((r) => r.value === reportKey)!, [reportKey]);
  const currentScope = useMemo(
    () => scopeOptions.find((s) => s.id === scopeId),
    [scopeOptions, scopeId],
  );
  const currentGroup = useMemo(
    () => groupOptions.find((g) => g.id === groupId) ?? null,
    [groupOptions, groupId],
  );

  const { pending, result, run } = useRunReport();

  const summaryLine =
    `${currentScope ? currentScope.name : 'no scope'}${currentGroup ? ` · ${currentGroup.name}` : ''} · ` +
    (currentReport.usesDates
      ? preset === 'custom'
        ? `${customFrom || 'beginning'} → ${customTo}`
        : (PRESETS.find((p) => p.key === preset)?.label ?? preset)
      : 'point-in-time');

  const runNow = () =>
    run({
      reportKey,
      scopeId,
      scopeName: currentScope?.name ?? '',
      preset,
      customFrom,
      customTo,
      group: currentGroup,
    });

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart className="h-6 w-6" />
          Reports
        </h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Choose a question, say which part of the association and which dates it should cover, then
          run it. Every result is explained in plain words before the numbers, and can be exported
          as a formatted Excel file to send on. Running a report only reads data — it never changes
          anything.
        </p>
      </div>

      <ReportCataloguePicker value={reportKey} onChange={setReportKey} />

      <ReportControlsCard
        scopeOptions={scopeOptions}
        scopeId={scopeId}
        onScopeChange={setScopeId}
        groupOptions={groupOptions}
        groupId={groupId}
        onGroupChange={setGroupId}
        usesDates={currentReport.usesDates}
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
        summaryLine={summaryLine}
        canRun={!!scopeId}
        pending={pending}
        onRun={runNow}
      />

      <ReportResultPanel result={result} scopeCurrency={currentScope?.currency ?? ''} />
    </section>
  );
}
