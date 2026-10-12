import { CopyButton } from './copy-button';

export function DetailCopyableField({
  label,
  value,
  truncate,
}: {
  readonly label: string;
  readonly value: string | null;
  readonly truncate?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {value && <CopyButton value={value} />}
      </div>
      <span
        className={
          truncate
            ? 'truncate font-mono text-xs text-foreground'
            : 'break-all font-mono text-xs text-foreground'
        }
        title={truncate && value ? value : undefined}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}
