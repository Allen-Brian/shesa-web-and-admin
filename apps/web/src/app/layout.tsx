import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/footer/site-footer';
import { Analytics } from '@vercel/analytics/next';

import { LenisProvider } from '@/components/lenis-provider';
import { SiteNav } from '@/components/nav/site-nav';
import { PromoFlyer } from '@/components/promo/promo-flyer';
import { clientEnv } from '@shesa/config/env.client';

import { siteConfig } from '@/lib/site-config';

import './globals.css';

/**
 * Fonts are self-hosted via public/fonts + @font-face rules in
 * ./fonts.css (imported from globals.css). We used to depend on
 * next/font/google, but its build-time fetch to fonts.gstatic.com
 * silently drops font faces when the network is flaky, the site
 * would then render in system fallbacks with no warning. Bundling
 * the .woff2 files makes the font layer offline-reproducible.
 */

/**
 * Site-wide metadata.
 *
 * `metadataBase` is what makes every relative image and canonical below
 * resolve to an absolute URL — without it Next emits relative OG tags,
 * which crawlers and social cards ignore.
 *
 * The title template lets each page set a short title and still be
 * indexed under the association's name.
 */
export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_WEB_APP_URL),
  title: {
    default: `${siteConfig.name}, ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'SHESA',
    'Sacred Heart College Mankon',
    'SAHECO',
    'Sacred Heart alumni',
    'SHESA alumni',
    'Cameroon alumni association',
    'Viriliter Age',
    'Bamenda',
    'AGM 2026',
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    title: `${siteConfig.name}, ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: '/',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name}, ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  icons: {
    icon: '/shesa.png',
    shortcut: '/shesa.png',
    apple: '/shesa.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'Education',
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
          <PromoFlyer />
        </LenisProvider>

        {/* Vercel Web Analytics — visitors and page views.
            Cookieless and no cross-site identifier, so it needs no consent
            banner; it is also first-party, served from /_vercel/insights
            on this domain, which is what keeps it working under the CSP
            and past the ad blockers that would drop a third-party host. */}
        <Analytics />
      </body>
    </html>
  );
}
