'use client';

import { BarChart3, Download } from 'lucide-react';

import { Button, DataTable } from '@shesa/ui';

import { buildReportColumns } from './report-columns';
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
        <p className="text-sm text-muted-foreground">
          Pick a report + scope above, then click <span className="font-medium">Run report</span>.
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
          <h2 className="text-lg font-semibold text-foreground">
            {REPORTS.find((r) => r.value === result.report)?.label ?? result.report}
          </h2>
          <span className="text-xs text-muted-foreground">
            {result.scopeName} · {result.windowLabel} · {result.rows.length} row
            {result.rows.length === 1 ? '' : 's'} · ran{' '}
            {new Date(result.ranAt).toLocaleTimeString()}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={result.rows.length === 0}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {result.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No rows for this window. Try a wider range or a different scope.
        </div>
      ) : (
        <>
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
