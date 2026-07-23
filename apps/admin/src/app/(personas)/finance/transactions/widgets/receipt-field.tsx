import type { ReactNode } from 'react';

/**
 * Small label + value pair inside the receipt preview grid. Two-line
 * layout: caps label on top, the value slot underneath — matches the
 * printed receipt layout so the on-screen preview reads like the
 * paper output.
 */
export function ReceiptField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
