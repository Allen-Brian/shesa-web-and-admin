import * as React from 'react';
import { cn } from '../lib/cn';

interface GradientPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly asChild?: boolean;
  /** Softer variant with lower gradient intensity. Use inside dense grids. */
  readonly muted?: boolean;
}

const BASE_GRADIENT =
  'radial-gradient(298.84% 218.25% at 97.67% 103.47%, rgba(255,255,255,0.05) 0%, color-mix(in srgb, var(--color-primary) 5%, transparent) 100%), var(--color-card)';

const MUTED_GRADIENT =
  'radial-gradient(200% 180% at 100% 100%, rgba(255,255,255,0.03) 0%, color-mix(in srgb, var(--color-primary) 3%, transparent) 100%), var(--color-card)';

/**
 * Panel with the same radial gradient background used by StatsCard. Used
 * across finance surfaces to give hero cards, stat pills, and summary
 * blocks a consistent depth cue.
 */
export function GradientPanel({ className, style, muted = false, ...rest }: GradientPanelProps) {
  return (
    <div
      className={cn('rounded-2xl border', className)}
      style={{
        background: muted ? MUTED_GRADIENT : BASE_GRADIENT,
        borderColor: 'var(--color-border)',
        ...style,
      }}
      {...rest}
    />
  );
}
