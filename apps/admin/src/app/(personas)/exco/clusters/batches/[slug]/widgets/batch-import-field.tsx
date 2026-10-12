'use client';

import { Input } from '@shesa/ui';

interface BatchImportFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly type?: string;
  readonly hint?: string;
}

/**
 * Single labelled input used inside the invalid-row editor grid.
 * Compact styling (h-8, xs text) matches the density of a bulk-edit
 * form where an operator is scanning many rows.
 */
export function BatchImportField({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: BatchImportFieldProps) {
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
