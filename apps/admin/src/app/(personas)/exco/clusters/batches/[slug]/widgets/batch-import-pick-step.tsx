'use client';

import { Download, Upload } from 'lucide-react';

import { Button, Label } from '@shesa/ui';

import type { BatchImportScope } from './batch-import-types';

interface BatchImportPickStepProps {
  readonly scope: BatchImportScope;
  readonly file: File | null;
  readonly errorMsg: string | null;
  readonly pending: boolean;
  readonly onFileChange: (file: File | null) => void;
  readonly onCancel: () => void;
  readonly onUpload: () => void;
}

/**
 * "Pick" step: sample download tile, file input, expected-columns
 * reveal, error banner (if the last upload failed), Cancel/Upload
 * actions. All state lives in the parent dialog.
 */
export function BatchImportPickStep({
  scope,
  file,
  errorMsg,
  pending,
  onFileChange,
  onCancel,
  onUpload,
}: BatchImportPickStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Start from a sample</span>
          <span className="text-xs text-muted-foreground">
            10 real-shape rows matched to the seeded houses / networks / batches. Upload as-is (CSV
            path) or open in Excel and Save As .xlsx to test the Excel path.
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
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        {file && (
          <div className="text-xs text-muted-foreground">
            Selected: <span>{file.name}</span> ({Math.round(file.size / 1024)} KB)
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
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={!file || pending} onClick={onUpload}>
          <Upload className="h-4 w-4" />
          Upload & parse
        </Button>
      </div>
    </div>
  );
}
