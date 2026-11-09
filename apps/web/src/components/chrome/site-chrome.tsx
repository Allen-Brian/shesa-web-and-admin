'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/footer/site-footer';
import { SiteNav } from '@/components/nav/site-nav';
import { PromoFlyer } from '@/components/promo/promo-flyer';

/**
 * Site furniture, except on the routes that have to own the screen.
 *
 * Nearly every page wants the nav, the footer and the promo flyer. A
 * full-bleed campaign page does not: a trailer that opens in darkness
 * with a navigation bar across the top is not a trailer. Rather than
 * giving the app two root layouts, which would mean restructuring
 * every existing route into a group, the chrome asks the pathname
 * whether it is wanted.
 *
 * Prefix matching, so `/cup/2027` and any later edition are covered by
 * one entry.
 */
const BARE_ROUTES = ['/cup', '/platforms'] as const;

export function SiteChrome({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`));

  if (bare) return <>{children}</>;

  return (
    <>
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
      <PromoFlyer />
    </>
  );
}
