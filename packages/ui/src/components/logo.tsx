import * as React from 'react';

import { cn } from '../lib/cn';
import shesaMark from './shesa.png';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Rendered width/height in pixels. Defaults to 40 — header default for shells. */
  size?: number;
  /** Optional image override — pass a URL string to swap the bundled Shesa mark. */
  src?: string;
  /** Alt text for the image. Defaults to "Shesa". */
  alt?: string;
}

const resolveSrc = (asset: typeof shesaMark) => (typeof asset === 'string' ? asset : asset.src);

/**
 * Shesa mark. By default renders `shesa.png` bundled with the UI package.
 *
 * Passing `children` opts into the initials-tile fallback (bg-primary
 * square with a wordmark) — kept for surfaces that render a placeholder
 * before the branded image has loaded, or for future multi-org variants.
 */
const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ size = 40, className, style, src, alt = 'Shesa', children, ...props }, ref) => {
    if (children) {
      return (
        <div
          ref={ref}
          className={cn(
            'grid shrink-0 place-items-center rounded-lg bg-primary font-semibold leading-none text-primary-foreground',
            className,
          )}
          style={{ width: size, height: size, ...style }}
          {...props}
        >
          <span style={{ fontSize: Math.max(12, Math.round(size * 0.45)) }}>{children}</span>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('grid shrink-0 place-items-center', className)}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        <img
          src={src ?? resolveSrc(shesaMark)}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </div>
    );
  },
);
Logo.displayName = 'Logo';

export { Logo };
