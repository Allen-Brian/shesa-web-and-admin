import type * as React from 'react';

import { GradientPanel } from '@shesa/ui';

/**
 * Wrapper for every chart / distribution panel on the Reports tab —
 * gradient card with a small heading + optional subtitle stack, then
 * arbitrary body. Kept minimal so a card's height follows its content.
 */
export function ChargeChartCard({
  title,
  subtitle,
  children,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </GradientPanel>
  );
}

/** Placeholder used when a chart has no data to plot. */
export function ChargeEmptyChart({ message }: { readonly message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-xs italic text-muted-foreground">
      {message}
    </div>
  );
}
