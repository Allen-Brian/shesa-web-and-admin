'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Upload } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from '@shesa/ui';

import { attachExistingMembersToBranch } from './branch-import-actions';
import type { AttachOutcome, AttachRow, AttachSummary } from './branch-import-types';
import { parseBranchImportCsv } from './branch-import-csv-parser';
import { applyBranchImportPatch, branchImportRowKey } from './branch-import-edit-helpers';
import { BranchImportPickStep } from './branch-import-pick-step';
import { BranchImportSummaryStep } from './branch-import-summary-step';
import type {
  BranchImportEditableField,
  BranchImportRowEdits,
  BranchImportScope,
  BranchImportStep,
} from './branch-import-types';

export type { BranchImportScope } from './branch-import-types';

interface Props {
  readonly scope: BranchImportScope;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

type IssueOutcome = Extract<AttachOutcome, { kind: 'not_found' | 'failed' }>;

/**
 * Branch member import — attach existing members to this branch by
 * email / phone / member_code. For rows whose identifier doesn't
 * resolve, we fall back to CREATE-then-attach — batches remain the
 * ONLY entry-point for minting identities, but this dialog quietly
 * delegates the mint back to `members/create-member` so an operator
 * doesn't have to bounce between pages for a mixed roster.
 *
 * Rows are parsed client-side from CSV (Excel: Save As CSV). XLSX
 * support would need a client-side SheetJS bundle — deferred until an
 * operator actually asks for it.
 *
 * The three steps (pick / processing / done) live in their own files;
 * this orchestrator owns state + Server-Action wiring only.
 */
export function BranchMemberImportDialog({ scope, open, onOpenChange }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<BranchImportStep>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<AttachSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [edits, setEdits] = useState<Record<number, BranchImportRowEdits>>({});
  const [retrying, setRetrying] = useState(false);

  const issues = useMemo<IssueOutcome[]>(
    () =>
      (summary?.outcomes ?? []).filter(
        (o): o is IssueOutcome => o.kind === 'not_found' || o.kind === 'failed',
      ),
    [summary],
  );

  const reset = () => {
    setStep('pick');
    setFile(null);
    setSummary(null);
    setErrorMsg(null);
    setIssuesExpanded(false);
    setEdits({});
  };

  const setEdit = (rowIndex: number, field: BranchImportEditableField, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [rowIndex]: { ...(prev[rowIndex] ?? {}), [field]: value },
    }));
  };

  const handleUpload = () => {
    if (!file) return;
    setErrorMsg(null);
    setStep('processing');

    startTransition(async () => {
      let text: string;
      try {
        text = await file.text();
      } catch (err) {
        setStep('pick');
        const message = err instanceof Error ? err.message : 'Could not read the file.';
        setErrorMsg(message);
        toast.error(message);
        return;
      }

      let rows: AttachRow[];
      try {
        rows = parseBranchImportCsv(text);
      } catch (err) {
        setStep('pick');
        const message = err instanceof Error ? err.message : 'Could not parse the CSV.';
        setErrorMsg(message);
        toast.error(message);
        return;
      }
      if (rows.length === 0) {
        setStep('pick');
        setErrorMsg('The file has no data rows.');
        toast.error('The file has no data rows.');
        return;
      }

      const result = await attachExistingMembersToBranch({
        scopeId: scope.id,
        branchSlug: scope.slug,
        rows,
      });

      if (!result.ok) {
        setStep('pick');
        setErrorMsg(result.message);
        toast.error(result.message);
        return;
      }
      setSummary(result.summary);
      setStep('done');
      setEdits({});
      const successCount = result.summary.attached + result.summary.created;
      const issueCount = result.summary.notFound + result.summary.failed;
      if (successCount > 0) {
        toast.success(
          `${successCount} member${successCount === 1 ? '' : 's'} attached to ${scope.name}.`,
        );
        router.refresh();
      }
      if (issueCount > 0 && successCount === 0) {
        toast.info(`${issueCount} row${issueCount === 1 ? '' : 's'} need attention — fix below.`);
      }
      if (issueCount > 0) setIssuesExpanded(true);
    });
  };

  const runRetry = () => {
    if (!summary) return;
    const editedRows: AttachRow[] = issues
      .map((o) => {
        const patch = edits[o.rowIndex];
        if (!patch || Object.keys(patch).length === 0) return null;
        return applyBranchImportPatch(o.row, patch);
      })
      .filter((r): r is AttachRow => r !== null);

    if (editedRows.length === 0) {
      toast.info('Edit at least one row before retrying.');
      return;
    }

    setRetrying(true);
    startTransition(async () => {
      try {
        const res = await attachExistingMembersToBranch({
          scopeId: scope.id,
          branchSlug: scope.slug,
          rows: editedRows,
        });
        setRetrying(false);
        if (!res.ok) {
          toast.error(res.message);
          return;
        }
        const gained = res.summary.attached + res.summary.created;
        const stillFailing = res.summary.notFound + res.summary.failed;
        if (gained > 0) {
          toast.success(`${gained} more attached.`);
          router.refresh();
        }
        // Merge: keep the good outcomes from the first pass; replace this
        // retry's issues; drop resolved issues.
        setSummary((prev) => {
          if (!prev) return prev;
          const stillIssuesKeys = new Set(
            res.summary.outcomes
              .filter((o): o is IssueOutcome => o.kind === 'not_found' || o.kind === 'failed')
              .map((o) => branchImportRowKey(o)),
          );
          const prevOk = prev.outcomes.filter((o) => o.kind !== 'not_found' && o.kind !== 'failed');
          const retriedOk = res.summary.outcomes.filter(
            (o) => o.kind !== 'not_found' && o.kind !== 'failed',
          );
          const retriedIssues = res.summary.outcomes.filter(
            (o) => o.kind === 'not_found' || o.kind === 'failed',
          );
          const unchangedIssues = prev.outcomes.filter(
            (o): o is IssueOutcome =>
              (o.kind === 'not_found' || o.kind === 'failed') &&
              !edits[o.rowIndex] &&
              !stillIssuesKeys.has(branchImportRowKey(o as IssueOutcome)),
          );
          const merged = [...prevOk, ...retriedOk, ...retriedIssues, ...unchangedIssues];
          const totals = merged.reduce(
            (acc, o) => {
              if (o.kind === 'attached') acc.attached += 1;
              else if (o.kind === 'created_and_attached') acc.created += 1;
              else if (o.kind === 'already_member') acc.alreadyMember += 1;
              else if (o.kind === 'not_found') acc.notFound += 1;
              else if (o.kind === 'failed') acc.failed += 1;
              return acc;
            },
            { attached: 0, created: 0, alreadyMember: 0, notFound: 0, failed: 0 },
          );
          return { total: prev.total, outcomes: merged, ...totals };
        });
        setEdits({});
        if (stillFailing === 0 && gained > 0) {
          toast.success('All issues resolved.');
        }
      } catch (err) {
        setRetrying(false);
        toast.error(err instanceof Error ? err.message : 'Retry failed.');
      }
    });
  };

  const closeAndReset = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : closeAndReset())}>
      <DialogContent className={step === 'done' && issuesExpanded ? 'max-w-3xl' : 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Add members to {scope.name}
          </DialogTitle>
          <DialogDescription>
            Each row is looked up by email, phone, or member code — matches get a membership at this
            branch. Rows that don&apos;t match get created (batch → house → network resolved by the
            columns), then attached.
          </DialogDescription>
        </DialogHeader>

        {step === 'pick' && (
          <BranchImportPickStep
            file={file}
            errorMsg={errorMsg}
            pending={pending}
            onFileChange={setFile}
            onCancel={closeAndReset}
            onUpload={handleUpload}
          />
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Upload className="h-6 w-6 animate-pulse text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Resolving identifiers and attaching…
            </div>
          </div>
        )}

        {step === 'done' && summary && (
          <BranchImportSummaryStep
            summary={summary}
            issues={issues}
            edits={edits}
            issuesExpanded={issuesExpanded}
            onToggleIssues={() => setIssuesExpanded((v) => !v)}
            onEdit={setEdit}
            retrying={retrying}
            pending={pending}
            onRetry={runRetry}
            onReset={reset}
            onClose={closeAndReset}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
