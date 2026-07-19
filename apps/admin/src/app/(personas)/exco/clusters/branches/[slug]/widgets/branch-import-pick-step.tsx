'use client';

import { Download, Upload } from 'lucide-react';

import { Button, Label } from '@shesa/ui';

interface BranchImportPickStepProps {
  readonly file: File | null;
  readonly errorMsg: string | null;
  readonly pending: boolean;
  readonly onFileChange: (f: File | null) => void;
  readonly onCancel: () => void;
  readonly onUpload: () => void;
}

/**
 * Initial step of the branch member import dialog — sample download,
 * file picker, columns hint, error banner, and the Cancel / Upload
 * actions. Column hints are a static list so operators know what CSV
 * shape to send without cross-referencing the docs.
 */
export function BranchImportPickStep({
  file,
  errorMsg,
  pending,
  onFileChange,
  onCancel,
  onUpload,
}: BranchImportPickStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Start from a sample</span>
          <span className="text-xs text-muted-foreground">
            10 rows shaped for the get-or-create flow. Save As CSV in Excel if you want to edit
            before uploading.
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
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
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
        <summary className="cursor-pointer text-sm font-medium text-foreground">Columns</summary>
        <p className="mt-2 text-muted-foreground">
          Header row required. At least one identifier (<code>member_code</code>, <code>email</code>
          , or <code>phone</code>). Creation fields only used when the identifier doesn&apos;t match
          anyone.
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
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={!file || pending} onClick={onUpload}>
          <Upload className="h-4 w-4" />
          Attach members
        </Button>
      </div>
    </div>
  );
}
