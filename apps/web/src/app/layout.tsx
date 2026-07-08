import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Anton, Caveat, Montserrat } from 'next/font/google';

import { SiteFooter } from '@/components/footer/site-footer';
import { LenisProvider } from '@/components/lenis-provider';
import { SiteNav } from '@/components/nav/site-nav';
import { siteConfig } from '@/lib/site-config';

import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-montserrat',
  display: 'swap',
});

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${montserrat.variable} ${anton.variable} ${caveat.variable}`}>
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
