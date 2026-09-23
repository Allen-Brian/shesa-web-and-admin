'use client';

import { BarChart3, FileText } from 'lucide-react';

import { Button, DataTable } from '@shesa/ui';

import { ExportButton } from '@/components/export-button';

import { buildReportColumns } from './report-columns';
import { ReportNarrative } from './report-narrative';
import { buildReportExport } from './reports-export';
import { downloadCsv } from './reports-formatters';
import { REPORTS, type ResultRow, type RunResult } from './reports-types';
import { ResultInsights } from './result-insights';

interface ReportResultPanelProps {
  readonly result: RunResult | null;
  readonly scopeCurrency: string;
}

/**
 * Everything shown below the run controls: heading + CSV export
 * button, insights strip, and the results DataTable. Handles the
 * "no result yet" and "no rows for this window" empty states so the
 * orchestrator can just mount it unconditionally.
 */
export function ReportResultPanel({ result, scopeCurrency }: ReportResultPanelProps) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
        <p className="text-base font-medium text-foreground">Nothing has been run yet.</p>
        <p className="mx-auto mt-1 max-w-md text-base text-muted-foreground">
          Choose a report above, tell it which scope and dates to cover, then press{' '}
          <span className="font-medium text-foreground">Run report</span>. Nothing is changed by
          running one — you can try as many as you like.
        </p>
      </div>
    );
  }

  const exportCsv = () => {
    if (result.rows.length === 0) return;
    const cols = buildReportColumns(result.report);
    const header = cols.map((c) => c.headerName ?? String(c.colId ?? c.field ?? ''));
    const rows = result.rows.map((r) => {
      const rec = r as unknown as Record<string, unknown>;
      return cols.map((c) => {
        const field = (c.field ?? c.colId ?? '') as string;
        const v = rec[field];
        if (v === null || v === undefined) return '';
        if (typeof v === 'number') return String(v);
        return String(v);
      });
    });
    downloadCsv(`${result.report}-${new Date().toISOString().slice(0, 10)}`, [header, ...rows]);
  };

  const columnDefs = buildReportColumns(result.report);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            Step 3 · The answer
          </span>
          <h2 className="text-xl font-semibold text-foreground">
            {REPORTS.find((r) => r.value === result.report)?.label ?? result.report}
          </h2>
          <span className="text-sm text-muted-foreground">
            {result.scopeName}
            {result.groupName ? ` · ${result.groupName}` : ''} · {result.windowLabel} ·{' '}
            {result.rows.length} row{result.rows.length === 1 ? '' : 's'} · ran{' '}
            {new Date(result.ranAt).toLocaleTimeString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* CSV stays for anyone feeding these rows into something
              else; Excel is the one you would forward to a person. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={exportCsv}
            disabled={result.rows.length === 0}
            className="gap-1.5 text-muted-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            CSV
          </Button>
          <ExportButton
            spec={() => buildReportExport(result)}
            label="Export Excel"
            disabled={result.rows.length === 0}
          />
        </div>
      </div>

      {result.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-base font-medium text-foreground">
            This report came back empty — and that is an answer too.
          </p>
          <p className="mx-auto mt-1 max-w-md text-base text-muted-foreground">
            Nothing matched this scope and this window. Either nothing happened in that period, or
            the window is too narrow. Try widening the dates or picking a different scope.
          </p>
        </div>
      ) : (
        <>
          <ReportNarrative result={result} scopeCurrency={scopeCurrency} />
          <ResultInsights result={result} scopeCurrency={scopeCurrency} />
          <DataTable<ResultRow>
            rowData={result.rows}
            columnDefs={columnDefs}
            showColumnPicker={false}
            selectable={false}
          />
        </>
      )}
    </div>
  );
}
