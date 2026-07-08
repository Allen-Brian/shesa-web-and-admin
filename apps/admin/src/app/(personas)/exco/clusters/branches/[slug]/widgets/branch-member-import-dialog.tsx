'use client';

import { useMemo, useState, useTransition } from 'react';
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
  attachExistingMembersToBranch,
  type AttachOutcome,
  type AttachRow,
  type AttachSummary,
} from './branch-import-actions';

export interface BranchImportScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

interface Props {
  readonly scope: BranchImportScope;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

type Step = 'pick' | 'processing' | 'done';

/**
 * Branch member import: attach existing members to this branch by
 * email / phone / member_code. For rows whose identifier doesn't
 * resolve, we fall back to CREATE-then-attach — batches remain the
 * ONLY entry-point for minting identities, but this dialog quietly
 * delegates the mint back to `members/create-member` so an operator
 * doesn't have to bounce between pages for a mixed roster.
 *
 * Rows are parsed client-side from CSV (Excel: Save As CSV). XLSX
 * support would need a client-side SheetJS bundle — deferred until
 * an operator actually asks for it.
 */
type EditableField =
  | 'fullName'
  | 'displayName'
  | 'email'
  | 'phone'
  | 'memberCode'
  | 'batchEntryYear'
  | 'house'
  | 'network';

type RowEdits = Partial<Record<EditableField, string>>;

export function BranchMemberImportDialog({ scope, open, onOpenChange }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<AttachSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [edits, setEdits] = useState<Record<number, RowEdits>>({});
  const [retrying, setRetrying] = useState(false);

  const issues = useMemo<Extract<AttachOutcome, { kind: 'not_found' | 'failed' }>[]>(
    () =>
      (summary?.outcomes ?? []).filter(
        (o): o is Extract<AttachOutcome, { kind: 'not_found' | 'failed' }> =>
          o.kind === 'not_found' || o.kind === 'failed',
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

  const setEdit = (rowIndex: number, field: EditableField, value: string) => {
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
        rows = parseCsv(text);
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
        return applyPatch(o.row, patch);
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
        // Merge: keep the good outcomes from the first pass; replace
        // this retry's issues; drop resolved issues.
        setSummary((prev) => {
          if (!prev) return prev;
          const stillIssuesKeys = new Set(
            res.summary.outcomes
              .filter((o) => o.kind === 'not_found' || o.kind === 'failed')
              .map((o) => rowKey(o)),
          );
          const prevOk = prev.outcomes.filter((o) => o.kind !== 'not_found' && o.kind !== 'failed');
          const retriedOk = res.summary.outcomes.filter(
            (o) => o.kind !== 'not_found' && o.kind !== 'failed',
          );
          const retriedIssues = res.summary.outcomes.filter(
            (o) => o.kind === 'not_found' || o.kind === 'failed',
          );
          const unchangedIssues = prev.outcomes.filter(
            (o) =>
              (o.kind === 'not_found' || o.kind === 'failed') &&
              !edits[o.rowIndex] && // not attempted this pass
              !stillIssuesKeys.has(rowKey(o)),
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
            {
              attached: 0,
              created: 0,
              alreadyMember: 0,
              notFound: 0,
              failed: 0,
            },
          );
          return {
            total: prev.total,
            outcomes: merged,
            ...totals,
          };
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Start from a sample</span>
                <span className="text-xs text-muted-foreground">
                  10 rows shaped for the get-or-create flow. Save As CSV in Excel if you want to
                  edit before uploading.
                </span>
              </div>
              <a
                href="/samples/shesa-branch-attach-sample.csv"
                download="shesa-branch-attach-sample.csv"
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
                Roster file (.csv)
              </Label>
              <input
                id="import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {file && (
                <div className="text-xs text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{file.name}</span> (
                  {Math.round(file.size / 1024)} KB)
                </div>
              )}
            </div>

            <details className="rounded-md border border-border bg-card p-3 text-xs">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Columns
              </summary>
              <p className="mt-2 text-muted-foreground">
                Header row required. At least one identifier (<code>member_code</code>,{' '}
                <code>email</code>, or <code>phone</code>). Creation fields only used when the
                identifier doesn&apos;t match anyone.
              </p>
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <li>member_code</li>
                <li>email</li>
                <li>phone</li>
                <li>full_name (create only)</li>
                <li>display_name</li>
                <li>batch_entry_year (create only)</li>
                <li>house (create only)</li>
                <li>network (create only)</li>
                <li>field</li>
                <li>entry_year</li>
                <li>exit_year</li>
                <li>current_country</li>
                <li>current_region_state</li>
                <li>current_city</li>
              </ul>
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
                Attach members
              </Button>
            </div>
          </div>
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
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="Attached" value={summary.attached} accent="ok" />
              <SummaryCard label="Created + attached" value={summary.created} accent="ok" />
              <SummaryCard
                label="Not resolved"
                value={summary.notFound}
                accent={summary.notFound > 0 ? 'error' : 'muted'}
              />
              <SummaryCard
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
                  onClick={() => setIssuesExpanded((v) => !v)}
                >
                  <span className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {issues.length} row{issues.length === 1 ? '' : 's'} need attention. Fix them
                    here and retry.
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
                          <IssueRowEditor
                            key={issue.rowIndex}
                            issue={issue}
                            edits={edits[issue.rowIndex] ?? {}}
                            onEdit={(field, value) => setEdit(issue.rowIndex, field, value)}
                          />
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={retrying || pending}
                          onClick={runRetry}
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
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                Import another
              </Button>
              <Button type="button" size="sm" onClick={closeAndReset}>
                Close
              </Button>
            </div>
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
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`text-xl font-semibold ${colors[accent]}`}>{value}</div>
    </div>
  );
}

interface IssueRowEditorProps {
  readonly issue: Extract<AttachOutcome, { kind: 'not_found' | 'failed' }>;
  readonly edits: RowEdits;
  readonly onEdit: (field: EditableField, value: string) => void;
}

function IssueRowEditor({ issue, edits, onEdit }: IssueRowEditorProps) {
  const val = (field: EditableField, current: unknown) =>
    edits[field] !== undefined
      ? (edits[field] as string)
      : current == null || current === ''
        ? ''
        : String(current);

  const title =
    (edits.fullName ?? issue.row.fullName ?? issue.identifier).toString().trim() ||
    `Row ${issue.rowIndex + 1}`;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Row {issue.rowIndex + 1}
          </span>
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
      </div>

      <div className="mb-3 flex items-start gap-1.5 text-[11px] text-destructive">
        <XCircle className="mt-px h-3 w-3 shrink-0" />
        <span>{issue.kind === 'failed' ? issue.message : issue.reason}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field
          label="Member code"
          value={val('memberCode', issue.row.memberCode)}
          onChange={(v) => onEdit('memberCode', v)}
          hint="Optional — takes precedence over email/phone"
        />
        <Field
          label="Full name"
          value={val('fullName', issue.row.fullName)}
          onChange={(v) => onEdit('fullName', v)}
        />
        <Field
          label="Email"
          value={val('email', issue.row.email)}
          onChange={(v) => onEdit('email', v)}
        />
        <Field
          label="Phone"
          value={val('phone', issue.row.phone)}
          onChange={(v) => onEdit('phone', v)}
        />
        <Field
          label="Batch entry year"
          type="number"
          value={val('batchEntryYear', issue.row.batchEntryYear)}
          onChange={(v) => onEdit('batchEntryYear', v)}
          hint="Required for new members"
        />
        <Field
          label="House"
          value={val('house', issue.row.house)}
          onChange={(v) => onEdit('house', v)}
          hint="e.g. St Thomas · St Francis · St John · St Peter"
        />
        <Field
          label="Network"
          value={val('network', issue.row.network)}
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
 * Merge an edit patch (all UI-side strings) on top of the row we sent
 * originally. Empty strings become null so the server treats them as
 * "clear this field" rather than "keep the old value".
 */
function applyPatch(row: AttachRow, patch: RowEdits): AttachRow {
  const nextStr = (k: keyof RowEdits, current: string | null | undefined) =>
    patch[k] !== undefined
      ? patch[k]!.trim() === ''
        ? null
        : patch[k]!.trim()
      : (current ?? null);
  const nextYear = (): number | null => {
    if (patch.batchEntryYear === undefined) return row.batchEntryYear ?? null;
    const raw = patch.batchEntryYear.trim();
    if (raw === '') return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    ...row,
    memberCode: nextStr('memberCode', row.memberCode),
    fullName: nextStr('fullName', row.fullName),
    displayName: nextStr('displayName', row.displayName),
    email: nextStr('email', row.email),
    phone: nextStr('phone', row.phone),
    batchEntryYear: nextYear(),
    house: nextStr('house', row.house),
    network: nextStr('network', row.network),
  };
}

/**
 * Stable key for an issue row — used to figure out which issues from
 * the retry are actually the SAME rows as those in the previous pass
 * (identifier can change between passes, so rowIndex is safer).
 */
function rowKey(o: Extract<AttachOutcome, { kind: 'not_found' | 'failed' }>): string {
  return String(o.rowIndex);
}

/**
 * Minimal CSV parser: handles the "one field per header" case with
 * quoted fields containing commas or embedded newlines. Enough for
 * the roster shape here — Excel-produced CSVs from the sample file
 * round-trip cleanly.
 */
function parseCsv(text: string): AttachRow[] {
  const lines: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r') {
        // ignore — handled with \n
      } else if (c === '\n') {
        row.push(field);
        lines.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    lines.push(row);
  }

  const nonEmpty = lines.filter((l) => l.some((c) => c.trim().length > 0));
  if (nonEmpty.length < 2) return [];

  const header = nonEmpty[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const idx = (col: string) => header.indexOf(col);

  const iMemberCode = idx('member_code');
  const iEmail = idx('email');
  const iPhone = idx('phone');
  const iFullName = idx('full_name');
  const iDisplayName = idx('display_name');
  const iBatchYear = idx('batch_entry_year');
  const iHouse = idx('house');
  const iNetwork = idx('network');
  const iField = idx('field');
  const iEntryYear = idx('entry_year');
  const iExitYear = idx('exit_year');
  const iCountry = idx('current_country');
  const iRegion = idx('current_region_state');
  const iCity = idx('current_city');

  const parseYear = (raw: string | undefined): number | null => {
    if (!raw) return null;
    const n = Number.parseInt(raw.trim(), 10);
    return Number.isNaN(n) ? null : n;
  };

  const rows: AttachRow[] = [];
  for (const cells of nonEmpty.slice(1)) {
    const at = (i: number) => (i >= 0 ? cells[i]?.trim() || null : null);
    rows.push({
      memberCode: at(iMemberCode),
      email: at(iEmail),
      phone: at(iPhone),
      fullName: at(iFullName),
      displayName: at(iDisplayName),
      batchEntryYear: parseYear(cells[iBatchYear]),
      house: at(iHouse),
      network: at(iNetwork),
      field: at(iField),
      entryYear: parseYear(cells[iEntryYear]),
      exitYear: parseYear(cells[iExitYear]),
      currentCountry: at(iCountry),
      currentRegionState: at(iRegion),
      currentCity: at(iCity),
    });
  }
  return rows;
}
