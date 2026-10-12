'use client';

import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

import { Button } from '@shesa/ui';

import type { AttachOutcome, AttachSummary } from './branch-import-types';
import { BranchImportIssueRowEditor } from './branch-import-issue-row-editor';
import { BranchImportSummaryCard } from './branch-import-summary-card';
import type { BranchImportEditableField, BranchImportRowEdits } from './branch-import-types';

interface BranchImportSummaryStepProps {
  readonly summary: AttachSummary;
  readonly issues: readonly Extract<AttachOutcome, { kind: 'not_found' | 'failed' }>[];
  readonly edits: Record<number, BranchImportRowEdits>;
  readonly issuesExpanded: boolean;
  readonly onToggleIssues: () => void;
  readonly onEdit: (rowIndex: number, field: BranchImportEditableField, value: string) => void;
  readonly retrying: boolean;
  readonly pending: boolean;
  readonly onRetry: () => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

/**
 * "Done" step of the import dialog — 4-card summary, expandable issues
 * panel with per-row editors + retry, and the close/import-another
 * action row.
 */
export function BranchImportSummaryStep({
  summary,
  issues,
  edits,
  issuesExpanded,
  onToggleIssues,
  onEdit,
  retrying,
  pending,
  onRetry,
  onReset,
  onClose,
}: BranchImportSummaryStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BranchImportSummaryCard label="Attached" value={summary.attached} accent="ok" />
        <BranchImportSummaryCard label="Created + attached" value={summary.created} accent="ok" />
        <BranchImportSummaryCard
          label="Not resolved"
          value={summary.notFound}
          accent={summary.notFound > 0 ? 'error' : 'muted'}
        />
        <BranchImportSummaryCard
          label="Failed"
          value={summary.failed}
          accent={summary.failed > 0 ? 'error' : 'muted'}
        />
      </div>

      {issues.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
            onClick={onToggleIssues}
          >
            <span className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-3.5 w-3.5" />
              {issues.length} row{issues.length === 1 ? '' : 's'} need attention. Fix them here and
              retry.
            </span>
            {issuesExpanded ? (
              <ChevronUp className="h-4 w-4 text-amber-800 dark:text-amber-200" />
            ) : (
              <ChevronDown className="h-4 w-4 text-amber-800 dark:text-amber-200" />
            )}
          </button>

          {issuesExpanded && (
            <div className="border-t border-amber-500/40 bg-background/50 p-3">
              <div className="flex flex-col gap-3">
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {issues.map((issue) => (
                    <BranchImportIssueRowEditor
                      key={issue.rowIndex}
                      issue={issue}
                      edits={edits[issue.rowIndex] ?? {}}
                      onEdit={(field, value) => onEdit(issue.rowIndex, field, value)}
                    />
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={retrying || pending}
                    onClick={onRetry}
                  >
                    <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
                    {retrying ? 'Retrying…' : 'Retry edited rows'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          Import another
        </Button>
        <Button type="button" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
