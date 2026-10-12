'use client';

import { XCircle } from 'lucide-react';

import type { AttachOutcome } from './branch-import-types';
import { BranchImportField } from './branch-import-field';
import type { BranchImportEditableField, BranchImportRowEdits } from './branch-import-types';

interface BranchImportIssueRowEditorProps {
  readonly issue: Extract<AttachOutcome, { kind: 'not_found' | 'failed' }>;
  readonly edits: BranchImportRowEdits;
  readonly onEdit: (field: BranchImportEditableField, value: string) => void;
}

/**
 * Editable form for a single failed-or-not-found import row. Falls back
 * to `Row N` in the title when no name is present so operators can
 * still tell rows apart.
 */
export function BranchImportIssueRowEditor({
  issue,
  edits,
  onEdit,
}: BranchImportIssueRowEditorProps) {
  const val = (field: BranchImportEditableField, current: unknown) =>
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
        <BranchImportField
          label="Member code"
          value={val('memberCode', issue.row.memberCode)}
          onChange={(v) => onEdit('memberCode', v)}
          hint="Optional — takes precedence over email/phone"
        />
        <BranchImportField
          label="Full name"
          value={val('fullName', issue.row.fullName)}
          onChange={(v) => onEdit('fullName', v)}
        />
        <BranchImportField
          label="Email"
          value={val('email', issue.row.email)}
          onChange={(v) => onEdit('email', v)}
        />
        <BranchImportField
          label="Phone"
          value={val('phone', issue.row.phone)}
          onChange={(v) => onEdit('phone', v)}
        />
        <BranchImportField
          label="Batch entry year"
          type="number"
          value={val('batchEntryYear', issue.row.batchEntryYear)}
          onChange={(v) => onEdit('batchEntryYear', v)}
          hint="Required for new members"
        />
        <BranchImportField
          label="House"
          value={val('house', issue.row.house)}
          onChange={(v) => onEdit('house', v)}
          hint="e.g. St Thomas · St Francis · St John · St Peter"
        />
        <BranchImportField
          label="Network"
          value={val('network', issue.row.network)}
          onChange={(v) => onEdit('network', v)}
          hint="e.g. Shesa Tech · Shesa Legal · Shesa Santé · Shesa Gov · Shesa Education"
        />
      </div>
    </div>
  );
}
