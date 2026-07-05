'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileSpreadsheet, Upload, XCircle } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  toast,
} from '@shesa/ui';

import { getBrowserClient } from '@/lib/supabase-browser';

import { confirmMemberImport, uploadMemberImport, type ImportSummary } from '../../actions';

export interface BatchImportScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

interface BatchImportDialogProps {
  readonly scope: BatchImportScope;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

type Step = 'pick' | 'uploading' | 'review' | 'confirming' | 'done';

const MEMBER_IMPORTS_BUCKET = 'member-imports';

/**
 * Batch import dialog: pick file → upload/validate → review counts →
 * confirm. The file is uploaded to `member-imports` bucket client-side
 * (bypasses passing large payloads through Server Actions); the actions
 * layer then invokes the Edge Functions to parse, validate, and commit.
 *
 * XLSX columns expected (per _shared/import-validation.ts):
 *   full_name (required), email, phone, display_name, batch_entry_year,
 *   house, network, field, entry_year, exit_year,
 *   current_country, current_region_state, current_city.
 */
export function BatchImportDialog({ scope, open, onOpenChange }: BatchImportDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setStep('pick');
    setFile(null);
    setSummary(null);
    setErrorMsg(null);
  };

  const handleUpload = () => {
    if (!file) return;
    setStep('uploading');
    setErrorMsg(null);

    startTransition(async () => {
      const supabase = getBrowserClient();

      // Path: {scopeId}/{timestamp}-{filename}. Timestamp keeps re-uploads
      // of the same file from colliding under the ON CONFLICT-less bucket.
      const timestamp = Date.now();
      const storagePath = `${scope.id}/${timestamp}-${file.name}`;

      const { error: upErr } = await supabase.storage
        .from(MEMBER_IMPORTS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (upErr) {
        setStep('pick');
        setErrorMsg(upErr.message || 'File upload failed.');
        toast.error(upErr.message || 'File upload failed.');
        return;
      }

      const result = await uploadMemberImport({
        scopeId: scope.id,
        fileName: file.name,
        storagePath,
      });

      if (!result.ok) {
        setStep('pick');
        setErrorMsg(result.message);
        toast.error(result.message);
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
      toast.success(
        `${result.createdRows} member${result.createdRows === 1 ? '' : 's'} imported into ${scope.name}.`,
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

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : closeAndReset())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import members into {scope.name}
          </DialogTitle>
          <DialogDescription>
            Upload an .xlsx roster. Every row is parsed server-side and validated against the
            batches / houses / networks catalog before anything is written.
          </DialogDescription>
        </DialogHeader>

        {step === 'pick' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <Label
                htmlFor="import-file"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                XLSX file
              </Label>
              <input
                id="import-file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {file && (
                <div className="text-xs text-muted-foreground">
                  Selected: <span className="font-mono">{file.name}</span> (
                  {Math.round(file.size / 1024)} KB)
                </div>
              )}
            </div>

            <details className="rounded-md border border-border bg-card p-3 text-xs">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Expected columns
              </summary>
              <p className="mt-2 text-muted-foreground">
                Header row is required. Column names (case-sensitive):
              </p>
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
                <li>full_name *</li>
                <li>email</li>
                <li>phone</li>
                <li>display_name</li>
                <li>batch_entry_year</li>
                <li>house</li>
                <li>network</li>
                <li>field</li>
                <li>entry_year</li>
                <li>exit_year</li>
                <li>current_country</li>
                <li>current_region_state</li>
                <li>current_city</li>
              </ul>
              <p className="mt-1 text-[11px] text-muted-foreground">* = required.</p>
            </details>

            {errorMsg && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={closeAndReset}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={!file || pending} onClick={handleUpload}>
                <Upload className="h-4 w-4" />
                Upload & parse
              </Button>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Upload className="h-6 w-6 animate-pulse text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Uploading and parsing…</div>
          </div>
        )}

        {step === 'review' && summary && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard label="Total rows" value={summary.totalRows} />
              <SummaryCard label="Valid" value={summary.validRows} accent="ok" />
              <SummaryCard
                label="Invalid"
                value={summary.invalidRows}
                accent={summary.invalidRows > 0 ? 'error' : 'muted'}
              />
            </div>

            {summary.invalidRows > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                {summary.invalidRows} row{summary.invalidRows === 1 ? '' : 's'} failed validation.
                Only valid rows will be created when you confirm; invalid rows are skipped and
                surfaced in the batch review log.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={reset} disabled={pending}>
                Start over
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending || summary.validRows === 0}
                onClick={handleConfirm}
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm import ({summary.validRows})
              </Button>
            </div>
          </div>
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

function SummaryCard({
  label,
  value,
  accent = 'muted',
}: {
  readonly label: string;
  readonly value: number;
  readonly accent?: 'muted' | 'ok' | 'error';
}) {
  const colors: Record<string, string> = {
    muted: 'text-foreground',
    ok: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-destructive',
  };
  const Icon = accent === 'error' ? XCircle : accent === 'ok' ? CheckCircle2 : null;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-center">
      <div
        className={`flex items-center justify-center gap-1 text-xs uppercase tracking-wider text-muted-foreground`}
      >
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`text-xl font-semibold ${colors[accent]}`}>{value}</div>
    </div>
  );
}
