'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  XCircle,
} from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from '@shesa/ui';

import {
  confirmMemberImport,
  fetchInvalidImportRows,
  revalidateImportBatch,
  saveImportRowEdits,
  uploadAndParseMemberImport,
  type ImportSummary,
  type InvalidImportRow,
} from '../../actions';

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
type EditableField =
  'fullName' | 'displayName' | 'email' | 'phone' | 'batchEntryYear' | 'house' | 'network';

type RowEdits = Partial<Record<EditableField, string>>;

export function BatchImportDialog({ scope, open, onOpenChange }: BatchImportDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Invalid-rows editor state
  const [invalidExpanded, setInvalidExpanded] = useState(false);
  const [invalidRows, setInvalidRows] = useState<InvalidImportRow[]>([]);
  const [invalidLoading, setInvalidLoading] = useState(false);
  const [edits, setEdits] = useState<Record<string, RowEdits>>({});
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

  // When the review step first appears, fetch the invalid rows so
  // the operator can open the editor without a second round-trip.
  useEffect(() => {
    if (step === 'review' && summary && summary.invalidRows > 0 && invalidRows.length === 0) {
      void loadInvalidRows(summary.batchId);
    }
  }, [step, summary, invalidRows.length, loadInvalidRows]);

  const setEdit = (rowId: string, field: EditableField, value: string) => {
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
        // Push every row-level edit that has at least one field. The
        // server merges into the existing normalized_data so we don't
        // lose fields the operator didn't touch.
        const toSave = Object.entries(edits).filter(([, v]) => Object.keys(v).length > 0);
        for (const [rowId, patch] of toSave) {
          const res = await saveImportRowEdits({
            rowId,
            edits: toEditsPayload(patch),
          });
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

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : closeAndReset())}>
      <DialogContent
        className={
          step === 'review' && summary && summary.invalidRows > 0 && invalidExpanded
            ? 'max-w-3xl'
            : 'max-w-lg'
        }
      >
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Start from a sample</span>
                <span className="text-xs text-muted-foreground">
                  10 real-shape rows matched to the seeded houses / networks / batches. Upload as-is
                  (CSV path) or open in Excel and Save As .xlsx to test the Excel path.
                </span>
              </div>
              <a
                href="/samples/shesa-member-import-sample.csv"
                download="shesa-member-import-sample.csv"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Download className="h-4 w-4" />
                Sample
              </a>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <Label
                htmlFor="import-file"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Roster file (.csv or .xlsx)
              </Label>
              <input
                id="import-file"
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {file && (
                <div className="text-xs text-muted-foreground">
                  Selected: <span className="">{file.name}</span> ({Math.round(file.size / 1024)}{' '}
                  KB)
                </div>
              )}
            </div>

            <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-foreground">
              Every row will be added to <span className="font-medium">{scope.name}</span>. No batch
              column needed.
            </div>

            <details className="rounded-md border border-border bg-card p-3 text-xs">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Expected columns
              </summary>
              <p className="mt-2 text-muted-foreground">
                Header row is required. Column names (case-sensitive):
              </p>
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <li>full_name *</li>
                <li>email</li>
                <li>phone</li>
                <li>display_name</li>
                <li>house</li>
                <li>network</li>
                <li>field</li>
                <li>entry_year</li>
                <li>exit_year</li>
                <li>current_country</li>
                <li>current_region_state</li>
                <li>current_city</li>
              </ul>
              <p className="mt-1 text-[11px] text-muted-foreground">
                * = required. `email` or `phone` — at least one required.
              </p>
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
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                  onClick={() => setInvalidExpanded((v) => !v)}
                >
                  <span className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {summary.invalidRows} row{summary.invalidRows === 1 ? '' : 's'} failed
                    validation. Fix them here or skip to import only valid rows.
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
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        Loading rows…
                      </div>
                    ) : invalidRows.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        No invalid rows to show.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                          {invalidRows.map((row) => (
                            <InvalidRowEditor
                              key={row.id}
                              row={row}
                              edits={edits[row.id] ?? {}}
                              onEdit={(field, value) => setEdit(row.id, field, value)}
                            />
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={revalidating || pending}
                            onClick={runRevalidate}
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${revalidating ? 'animate-spin' : ''}`}
                            />
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

interface InvalidRowEditorProps {
  readonly row: InvalidImportRow;
  readonly edits: RowEdits;
  readonly onEdit: (field: EditableField, value: string) => void;
}

function InvalidRowEditor({ row, edits, onEdit }: InvalidRowEditorProps) {
  const val = (field: EditableField, current: string | number | null) =>
    edits[field] !== undefined ? (edits[field] as string) : current == null ? '' : String(current);

  const title = (edits.fullName ?? row.fullName ?? '').toString().trim() || `Row ${row.rowNumber}`;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Row {row.rowNumber}
          </span>
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
      </div>

      {row.errors.length > 0 && (
        <ul className="mb-3 flex flex-col gap-0.5 text-[11px] text-destructive">
          {row.errors.map((e, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <XCircle className="mt-px h-3 w-3 shrink-0" />
              {e}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field
          label="Full name"
          value={val('fullName', row.fullName)}
          onChange={(v) => onEdit('fullName', v)}
        />
        <Field label="Email" value={val('email', row.email)} onChange={(v) => onEdit('email', v)} />
        <Field label="Phone" value={val('phone', row.phone)} onChange={(v) => onEdit('phone', v)} />
        <Field
          label="House"
          value={val('house', row.house)}
          onChange={(v) => onEdit('house', v)}
          hint="e.g. St Thomas · St Francis · St John · St Peter"
        />
        <Field
          label="Network"
          value={val('network', row.network)}
          onChange={(v) => onEdit('network', v)}
          hint="e.g. Shesa Tech · Shesa Legal · Shesa Santé · Shesa Gov · Shesa Education"
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly type?: string;
  readonly hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
      />
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

/**
 * Convert dialog-facing edit payload (all strings) to the shape the
 * server action wants (typed keys matching normalized_data column
 * names).
 */
function toEditsPayload(patch: RowEdits): Parameters<typeof saveImportRowEdits>[0]['edits'] {
  const out: Parameters<typeof saveImportRowEdits>[0]['edits'] = {};
  if (patch.fullName !== undefined) out.full_name = patch.fullName.trim() || null;
  if (patch.displayName !== undefined) out.display_name = patch.displayName.trim() || null;
  if (patch.email !== undefined) out.email = patch.email.trim().toLowerCase() || null;
  if (patch.phone !== undefined) out.phone = patch.phone.trim() || null;
  if (patch.batchEntryYear !== undefined) {
    const raw = patch.batchEntryYear.trim();
    out.batch_entry_year = raw === '' ? null : Number.parseInt(raw, 10);
  }
  if (patch.house !== undefined) out.house = patch.house.trim() || null;
  if (patch.network !== undefined) out.network = patch.network.trim() || null;
  return out;
}

/**
 * Storage errors bubble raw Postgres/PostgREST text like
 *   "new row violates row-level security policy for table \"objects\""
 * which is technically accurate but unactionable in a toast. Map the
 * common ones to something an operator can act on.
 */
function friendlyStorageError(raw: string | undefined | null): string {
  if (!raw) return 'File upload failed.';
  const lower = raw.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('policy')) {
    return 'You don’t have permission to upload member imports at this scope. Ask a Mainstream admin to grant member.import.';
  }
  if (lower.includes('mime type') && lower.includes('not supported')) {
    return `${raw} — try a .csv or .xlsx file.`;
  }
  if (lower.includes('exceed') && lower.includes('size')) {
    return 'File is too large. The member-imports bucket caps individual uploads at 10 MB.';
  }
  return raw;
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
