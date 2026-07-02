import * as React from 'react';
import { cn } from '../lib/cn';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width/height in pixels. Defaults to 40 — header default for shells. */
  size?: number;
}

/**
 * Academia mark — square primary tile with the "Ac" wordmark by default.
 * Pass `children` to override the inner text (e.g. the first letter of a
 * tenant institution name). Tenant-aware via `--color-primary`;
 * white-on-primary; rounded corners match the design system's `--radius-md`.
 */
const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ size = 40, className, style, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid shrink-0 place-items-center rounded-lg bg-primary font-semibold leading-none text-white',
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <span style={{ fontSize: Math.max(12, Math.round(size * 0.45)) }}>{children ?? 'Ac'}</span>
    </div>
  ),
);
Logo.displayName = 'Logo';

export { Logo };
