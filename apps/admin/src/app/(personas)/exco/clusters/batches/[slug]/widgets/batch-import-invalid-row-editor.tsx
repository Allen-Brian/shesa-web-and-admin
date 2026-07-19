'use client';

import { XCircle } from 'lucide-react';

import type { InvalidImportRow } from '../../batch-import-types';

import { BatchImportField } from './batch-import-field';
import type { BatchImportEditableField, BatchImportRowEdits } from './batch-import-types';

interface BatchImportInvalidRowEditorProps {
  readonly row: InvalidImportRow;
  readonly edits: BatchImportRowEdits;
  readonly onEdit: (field: BatchImportEditableField, value: string) => void;
}

/**
 * Editable inline card for one invalid roster row. Shows the row's
 * original errors on top, editable fields (full name, email, phone,
 * house, network) below. Edits are held in the parent dialog's state
 * and pushed on Save & re-validate.
 */
export function BatchImportInvalidRowEditor({
  row,
  edits,
  onEdit,
}: BatchImportInvalidRowEditorProps) {
  const val = (field: BatchImportEditableField, current: string | number | null) =>
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
        <BatchImportField
          label="Full name"
          value={val('fullName', row.fullName)}
          onChange={(v) => onEdit('fullName', v)}
        />
        <BatchImportField
          label="Email"
          value={val('email', row.email)}
          onChange={(v) => onEdit('email', v)}
        />
        <BatchImportField
          label="Phone"
          value={val('phone', row.phone)}
          onChange={(v) => onEdit('phone', v)}
        />
        <BatchImportField
          label="House"
          value={val('house', row.house)}
          onChange={(v) => onEdit('house', v)}
          hint="e.g. St Thomas · St Francis · St John · St Peter"
        />
        <BatchImportField
          label="Network"
          value={val('network', row.network)}
          onChange={(v) => onEdit('network', v)}
          hint="e.g. Shesa Tech · Shesa Legal · Shesa Santé · Shesa Gov · Shesa Education"
        />
      </div>
    </div>
  );
}
