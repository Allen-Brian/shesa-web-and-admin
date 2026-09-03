import Link from 'next/link';
import { CalendarDays, Newspaper, Star, Target } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import type { FeaturedItem } from './dashboard-types';
import { EmptyInline } from '@/components/dashboard/empty-inline';

const ICON_BY_KIND = {
  article: Newspaper,
  event: CalendarDays,
  project: Target,
} as const;

const HREF_BY_KIND = {
  article: (slug: string) => `/news/${slug}`,
  event: (slug: string) => `/events/${slug}`,
  project: (slug: string) => `/projects/${slug}`,
} as const;

/**
 * "Featured on the public site" panel. Rolls up the currently-flagged
 * article + event + project into one card so the operator always
 * knows what's on the front page without opening three tabs. Each
 * item links out to the PUBLIC-site page (not the editor form) so
 * the operator sees exactly what a visitor sees.
 */
export function EditorFeaturedPanel({ items }: { readonly items: readonly FeaturedItem[] }) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
          Featured on the site
        </span>
      </div>
      {items.length === 0 ? (
        <EmptyInline label="Nothing is featured yet. Flag an article / event / project as featured to spotlight it." />
      ) : (
        <ul className="flex flex-col divide-y divide-border/50">
          {items.map((item) => {
            const Icon = ICON_BY_KIND[item.kind];
            const href = HREF_BY_KIND[item.kind](item.slug);
            return (
              <li key={`${item.kind}:${item.slug}`} className="py-2.5 first:pt-0 last:pb-0">
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {item.title}
                    </span>
                    {item.hint && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {item.hint}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </GradientPanel>
  );
}
