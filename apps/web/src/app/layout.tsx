import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/footer/site-footer';
import { LenisProvider } from '@/components/lenis-provider';
import { SiteNav } from '@/components/nav/site-nav';
import { siteConfig } from '@/lib/site-config';

import './globals.css';

/**
 * Fonts are self-hosted via public/fonts + @font-face rules in
 * ./fonts.css (imported from globals.css). We used to depend on
 * next/font/google, but its build-time fetch to fonts.gstatic.com
 * silently drops font faces when the network is flaky — the site
 * would then render in system fallbacks with no warning. Bundling
 * the .woff2 files makes the font layer offline-reproducible.
 */

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black antialiased">
        <LenisProvider>
          <SiteNav />
          <main>{children}</main>
          <SiteFooter />
        </LenisProvider>
      </body>
    </html>
  );
}
