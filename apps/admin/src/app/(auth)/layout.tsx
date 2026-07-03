import type { ReactNode } from 'react';

import { ThemeToggle } from '@shesa/ui';

/**
 * Auth route-group layout — chromeless header (theme toggle only),
 * centered content column, thin footer. Wraps /login, /forgot-password,
 * /reset-password. The auth-owning routes (callback, logout) also live
 * in this group but render nothing directly.
 */
export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-end gap-2 px-4 pt-4 sm:px-8 sm:pt-6">
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
        {children}
      </div>

      <footer className="flex items-center justify-between border-t border-border/40 px-4 py-4 text-xs text-muted-foreground sm:px-8">
        <span>© {new Date().getFullYear()} Shesa. All rights reserved.</span>
      </footer>
    </div>
  );
}
