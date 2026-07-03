import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import NextTopLoader from 'nextjs-toploader';

import { THEME_INIT_SCRIPT, ThemeProvider, Toaster } from '@shesa/ui';

import './globals.css';

export const metadata: Metadata = {
  title: 'Shesa Admin',
  description: 'Shesa governance app — Exco, Finance, Editor.',
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets .dark on <html> before first paint — kills the theme flash
         * on refresh/navigation. See THEME_INIT_SCRIPT for the source. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <NextTopLoader
          color="var(--color-primary)"
          height={3}
          shadow={false}
          showSpinner={false}
          crawlSpeed={200}
          speed={300}
        />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
