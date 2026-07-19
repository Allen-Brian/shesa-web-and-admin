'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from '@shesa/ui';

import {
  fetchInvalidImportRows,
  revalidateImportBatch,
  saveImportRowEdits,
  uploadAndParseMemberImport,
} from '../../batch-import-actions';
import { confirmMemberImport } from '../../batch-member-actions';
import type { ImportSummary, InvalidImportRow } from '../../batch-import-types';

import { friendlyStorageError, toEditsPayload } from './batch-import-helpers';
import { BatchImportPickStep } from './batch-import-pick-step';
import { BatchImportReviewStep } from './batch-import-review-step';
import type {
  BatchImportEditableField,
  BatchImportRowEdits,
  BatchImportScope,
  BatchImportStep,
} from './batch-import-types';

export type { BatchImportScope } from './batch-import-types';

interface BatchImportDialogProps {
  readonly scope: BatchImportScope;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Batch import dialog: pick file → upload/validate → review counts →
 * confirm. The file is uploaded to `member-imports` bucket client-side
 * (bypasses passing large payloads through Server Actions); the actions
 * layer then invokes the Edge Functions to parse, validate, and commit.
 *
 * Each step (pick, review) lives in its own file — this orchestrator
 * owns the state machine, action calls, and toast handling.
 */
export function BatchImportDialog({ scope, open, onOpenChange }: BatchImportDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<BatchImportStep>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Invalid-rows editor state
  const [invalidExpanded, setInvalidExpanded] = useState(false);
  const [invalidRows, setInvalidRows] = useState<InvalidImportRow[]>([]);
  const [invalidLoading, setInvalidLoading] = useState(false);
  const [edits, setEdits] = useState<Record<string, BatchImportRowEdits>>({});
  const [revalidating, setRevalidating] = useState(false);

  const reset = () => {
    setStep('pick');
    setFile(null);
    setSummary(null);
    setErrorMsg(null);
    setInvalidExpanded(false);
    setInvalidRows([]);
    setEdits({});
  };

  const loadInvalidRows = useCallback(async (batchId: string) => {
    setInvalidLoading(true);
    const res = await fetchInvalidImportRows(batchId);
    setInvalidLoading(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setInvalidRows(res.rows);
    setEdits({});
  }, []);

  useEffect(() => {
    if (step === 'review' && summary && summary.invalidRows > 0 && invalidRows.length === 0) {
      void loadInvalidRows(summary.batchId);
    }
  }, [step, summary, invalidRows.length, loadInvalidRows]);

  const setEdit = (rowId: string, field: BatchImportEditableField, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] ?? {}), [field]: value },
    }));
  };

  const runRevalidate = () => {
    if (!summary) return;
    setRevalidating(true);
    startTransition(async () => {
      try {
        const toSave = Object.entries(edits).filter(([, v]) => Object.keys(v).length > 0);
        for (const [rowId, patch] of toSave) {
          const res = await saveImportRowEdits({ rowId, edits: toEditsPayload(patch) });
          if (!res.ok) {
            toast.error(`Save failed on row: ${res.message}`);
            setRevalidating(false);
            return;
          }
        }

        const res = await revalidateImportBatch(summary.batchId);
        if (!res.ok) {
          toast.error(res.message);
          setRevalidating(false);
          return;
        }
        setSummary({
          batchId: summary.batchId,
          totalRows: res.totalRows,
          validRows: res.validRows,
          invalidRows: res.invalidRows,
        });
        if (res.invalidRows === 0) {
          setInvalidRows([]);
          setInvalidExpanded(false);
          toast.success('All rows now valid.');
        } else {
          await loadInvalidRows(summary.batchId);
          const fixed = summary.invalidRows - res.invalidRows;
          if (fixed > 0) {
            toast.success(
              `${fixed} row${fixed === 1 ? '' : 's'} now valid. ${res.invalidRows} still invalid.`,
            );
          } else {
            toast.info(`${res.invalidRows} row${res.invalidRows === 1 ? '' : 's'} still invalid.`);
          }
        }
        setRevalidating(false);
      } catch (err) {
        setRevalidating(false);
        toast.error(err instanceof Error ? err.message : 'Re-validation failed.');
      }
    });
  };

  const handleUpload = () => {
    if (!file) return;
    setStep('uploading');
    setErrorMsg(null);
    startTransition(async () => {
      const result = await uploadAndParseMemberImport({ scopeId: scope.id, file });
      if (!result.ok) {
        setStep('pick');
        const friendly = friendlyStorageError(result.message);
        setErrorMsg(friendly);
        toast.error(friendly);
        return;
      }
      setSummary(result.summary);
      setStep('review');
    });
  };

  const handleConfirm = () => {
    if (!summary) return;
    setStep('confirming');
    startTransition(async () => {
      const result = await confirmMemberImport({
        batchId: summary.batchId,
        batchSlug: scope.slug,
      });
      if (!result.ok) {
        setStep('review');
        toast.error(result.message);
        return;
      }
      const inviteHint =
        result.invitesSent > 0
          ? ` ${result.invitesSent} invite${result.invitesSent === 1 ? '' : 's'} sent.`
          : '';
      const failedHint =
        result.invitesFailed > 0
          ? ` ${result.invitesFailed} invite${result.invitesFailed === 1 ? '' : 's'} failed — resend from Invites.`
          : '';
      toast.success(
        `${result.createdRows} member${result.createdRows === 1 ? '' : 's'} imported into ${scope.name}.${inviteHint}${failedHint}`,
      );
      setStep('done');
      router.refresh();
    });
  };

  const closeAndReset = () => {
    onOpenChange(false);
    // Reset after the close animation so the user doesn't see a flash.
    setTimeout(reset, 200);
  };

  const wide = step === 'review' && summary && summary.invalidRows > 0 && invalidExpanded;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : closeAndReset())}>
      <DialogContent className={wide ? 'max-w-3xl' : 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import members into {scope.name}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel roster. Every row is parsed server-side and validated against the
            batches / houses / networks catalog before anything is written.
          </DialogDescription>
        </DialogHeader>

        {step === 'pick' && (
          <BatchImportPickStep
            scope={scope}
            file={file}
            errorMsg={errorMsg}
            pending={pending}
            onFileChange={setFile}
            onCancel={closeAndReset}
            onUpload={handleUpload}
          />
        )}

        {step === 'uploading' && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Upload className="h-6 w-6 animate-pulse text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Uploading and parsing…</div>
          </div>
        )}

        {step === 'review' && summary && (
          <BatchImportReviewStep
            summary={summary}
            invalidRows={invalidRows}
            invalidLoading={invalidLoading}
            invalidExpanded={invalidExpanded}
            onToggleInvalidExpanded={() => setInvalidExpanded((v) => !v)}
            edits={edits}
            onSetEdit={setEdit}
            revalidating={revalidating}
            pending={pending}
            onRevalidate={runRevalidate}
            onReset={reset}
            onConfirm={handleConfirm}
          />
        )}

        {step === 'confirming' && (
          <div className="flex flex-col items-center gap-2 py-8">
            <CheckCircle2 className="h-6 w-6 animate-pulse text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Committing rows…</div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div className="text-sm font-medium text-foreground">Import complete.</div>
            <Button type="button" size="sm" onClick={closeAndReset}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
