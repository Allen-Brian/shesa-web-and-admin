'use client';

import * as React from 'react';

import { SidebarInset, SidebarProvider } from '@shesa/ui';

import { AppSidebar } from '@/components/app-sidebar';
import { BreadcrumbProvider } from '@/components/breadcrumb-context';
import { Topbar } from '@/components/topbar';
import type { Persona } from '@/lib/personas';

interface AppShellProps {
  readonly persona: Persona;
  readonly userEmail: string;
  readonly userName: string;
  readonly avatarUrl?: string;
  readonly children: React.ReactNode;
}

/**
 * Full persona shell — sidebar + topbar + main pane. Runs as a client
 * component so it can host the SidebarProvider (which manages
 * open/close state client-side).
 *
 * Auto-collapses the sidebar below 1200px viewport; the user can still
 * toggle it manually via SidebarTrigger.
 */
export function AppShell({ persona, userEmail, userName, avatarUrl, children }: AppShellProps) {
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1200px)');
    const update = () => setOpen(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <BreadcrumbProvider>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <AppSidebar persona={persona} />
        <SidebarInset>
          <Topbar userEmail={userEmail} userName={userName} avatarUrl={avatarUrl} />
          <main className="flex min-h-0 flex-1 flex-col px-6 py-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}
