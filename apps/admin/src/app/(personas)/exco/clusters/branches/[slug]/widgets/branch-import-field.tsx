import { Input } from '@shesa/ui';

interface BranchImportFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly type?: string;
  readonly hint?: string;
}

/**
 * Small labelled Input used inside the issue-row editor. Kept local so
 * label styling stays consistent across the editor's grid without
 * dragging in a shared form primitive.
 */
export function BranchImportField({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: BranchImportFieldProps) {
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
