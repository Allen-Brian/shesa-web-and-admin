'use client';

import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

import { Button } from '@shesa/ui';

import type { ImportSummary, InvalidImportRow } from '../../batch-import-types';

import { BatchImportInvalidRowEditor } from './batch-import-invalid-row-editor';
import { BatchImportSummaryCard } from './batch-import-summary-card';
import type { BatchImportEditableField, BatchImportRowEdits } from './batch-import-types';

interface BatchImportReviewStepProps {
  readonly summary: ImportSummary;
  readonly invalidRows: readonly InvalidImportRow[];
  readonly invalidLoading: boolean;
  readonly invalidExpanded: boolean;
  readonly onToggleInvalidExpanded: () => void;
  readonly edits: Record<string, BatchImportRowEdits>;
  readonly onSetEdit: (rowId: string, field: BatchImportEditableField, value: string) => void;
  readonly revalidating: boolean;
  readonly pending: boolean;
  readonly onRevalidate: () => void;
  readonly onReset: () => void;
  readonly onConfirm: () => void;
}

/**
 * "Review" step: three summary cards (total / valid / invalid), an
 * expandable invalid-rows editor with re-validate action, and the
 * Start-over / Confirm-import buttons. All state lives in the parent
 * dialog.
 */
export function BatchImportReviewStep({
  summary,
  invalidRows,
  invalidLoading,
  invalidExpanded,
  onToggleInvalidExpanded,
  edits,
  onSetEdit,
  revalidating,
  pending,
  onRevalidate,
  onReset,
  onConfirm,
}: BatchImportReviewStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <BatchImportSummaryCard label="Total rows" value={summary.totalRows} />
        <BatchImportSummaryCard label="Valid" value={summary.validRows} accent="ok" />
        <BatchImportSummaryCard
          label="Invalid"
          value={summary.invalidRows}
          accent={summary.invalidRows > 0 ? 'error' : 'muted'}
        />
      </div>

      {summary.invalidRows > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
            onClick={onToggleInvalidExpanded}
          >
            <span className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-3.5 w-3.5" />
              {summary.invalidRows} row{summary.invalidRows === 1 ? '' : 's'} failed validation. Fix
              them here or skip to import only valid rows.
            </span>
            {invalidExpanded ? (
              <ChevronUp className="h-4 w-4 text-amber-800 dark:text-amber-200" />
            ) : (
              <ChevronDown className="h-4 w-4 text-amber-800 dark:text-amber-200" />
            )}
          </button>

          {invalidExpanded && (
            <div className="border-t border-amber-500/40 bg-background/50 p-3">
              {invalidLoading ? (
                <div className="py-4 text-center text-xs text-muted-foreground">Loading rows…</div>
              ) : invalidRows.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No invalid rows to show.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {invalidRows.map((row) => (
                      <BatchImportInvalidRowEditor
                        key={row.id}
                        row={row}
                        edits={edits[row.id] ?? {}}
                        onEdit={(field, value) => onSetEdit(row.id, field, value)}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={revalidating || pending}
                      onClick={onRevalidate}
                    >
                      <RefreshCw className={`h-4 w-4 ${revalidating ? 'animate-spin' : ''}`} />
                      {revalidating ? 'Re-validating…' : 'Save & re-validate'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          loading={pending}
          disabled={pending}
        >
          Start over
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || summary.validRows === 0}
          onClick={onConfirm}
        >
          <CheckCircle2 className="h-4 w-4" />
          Confirm import ({summary.validRows})
        </Button>
      </div>
    </div>
  );
}
