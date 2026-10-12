export function DetailField({
  label,
  value,
  mono,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={mono ? 'break-all font-mono text-xs text-foreground' : 'text-sm text-foreground'}
      >
        {value}
      </span>
    </div>
  );
}
