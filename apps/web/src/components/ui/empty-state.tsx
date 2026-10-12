import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  readonly icon: LucideIcon | ComponentType<{ readonly className?: string }>;
  readonly heading: string;
  readonly body: string;
  readonly cta?: {
    readonly label: string;
    readonly href: string;
  };
  readonly children?: ReactNode;
  /** Optional per-section tint override — accepts any Tailwind text-* class. */
  readonly tone?: 'default' | 'dark';
}

/**
 * Uniform empty state block for pages/sections whose data comes from
 * the DB. Muted icon in a small tile, one-line heading, one supporting
 * sentence, optional CTA button. Rendered inside the section's own
 * container so surrounding layout (nav, hero, footer) stays put.
 *
 * Use `tone="dark"` on dark-backgrounded sections so the type stays
 * legible without adding a wrapping element with its own background.
 */
export function EmptyState({
  icon: Icon,
  heading,
  body,
  cta,
  children,
  tone = 'default',
}: EmptyStateProps) {
  const isDark = tone === 'dark';
  return (
    <div
      className={`flex flex-col items-center justify-center gap-5 rounded-xs border px-6 py-16 text-center md:py-20 ${
        isDark ? 'border-white/12 bg-white/[0.02] text-white' : 'border-black/8 bg-white text-black'
      }`}
    >
      <span
        aria-hidden
        className={`grid h-14 w-14 place-items-center rounded-full ${
          isDark ? 'bg-white/5 text-white/70' : 'bg-primary/6 text-primary'
        }`}
      >
        <Icon className="h-6 w-6" />
      </span>
      <div className="flex flex-col items-center gap-2">
        <h3
          className={`font-heading text-xl font-light ${isDark ? 'text-white' : 'text-black'}`}
          style={{ letterSpacing: '-0.01em' }}
        >
          {heading}
        </h3>
        <p
          className={`max-w-md text-[14.5px] leading-[1.75] ${
            isDark ? 'text-white/60' : 'text-black/60'
          }`}
        >
          {body}
        </p>
      </div>
      {cta ? (
        <Link
          href={cta.href}
          className={
            'group mt-2 inline-flex items-center gap-2 rounded-xs px-6 py-3 text-sm font-medium tracking-wide transition-all duration-500 hover:-translate-y-0.5 ' +
            (isDark
              ? 'bg-white text-black hover:bg-primary hover:text-white'
              : 'bg-black text-white hover:bg-primary')
          }
        >
          <span>{cta.label}</span>
          <span
            aria-hidden
            className={
              'grid h-5 w-5 place-items-center rounded-xs transition-transform group-hover:translate-x-0.5 ' +
              (isDark ? 'bg-black/10' : 'bg-white/15')
            }
          >
            →
          </span>
        </Link>
      ) : null}
      {children}
    </div>
  );
}
