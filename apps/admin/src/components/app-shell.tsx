'use client';

import * as React from 'react';

import { SidebarInset, SidebarProvider } from '@shesa/ui';

import { AppSidebar } from '@/components/app-sidebar';
import { BreadcrumbProvider } from '@/components/breadcrumb-context';
import { FinanceSidebar } from '@/components/finance-sidebar';
import { Topbar } from '@/components/topbar';
import type { SidebarGroupItem } from '@/lib/finance/groups/load-sidebar-groups';
import type { Persona } from '@/lib/personas';

interface AppShellProps {
  readonly persona: Persona;
  readonly userEmail: string;
  readonly userName: string;
  readonly avatarUrl?: string;
  readonly canManageClusters?: boolean;
  readonly canManageMemberships?: boolean;
  readonly canReadAudit?: boolean;
  readonly canEditOwnScope?: boolean;
  readonly canViewInvites?: boolean;
  readonly canReadFinance?: boolean;
  /** For finance persona — signals a NULL-scope grant (Global Finance). */
  readonly isGlobalFinance?: boolean;
  /**
   * For finance persona — event groups to render in the sidebar's
   * Event Groups section. Empty for branch finance users; RLS filters
   * them out server-side.
   */
  readonly sidebarGroups?: readonly SidebarGroupItem[];
  /**
   * True when the caller is a Mainstream (Global) Admin. Used by the
   * exco sidebar to hide items that are meaningless for the person
   * doing the imposing — e.g. Assessments is the receiver's view.
   */
  readonly isGlobalAdmin?: boolean;
  /**
   * True when the caller holds `cms.edit` — reveals the Content group
   * (Leadership et al.) in the sidebar. Set by the editor layout for
   * the Site Editor persona and by the exco layout for mainstream_admin.
   */
  readonly canEditCms?: boolean;
  /** Awards ceremonies, for the editor sidebar's Voting group. */
  readonly votingEditions?: readonly { slug: string; name: string }[];
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
export function AppShell({
  persona,
  userEmail,
  userName,
  avatarUrl,
  canManageClusters,
  canManageMemberships,
  canReadAudit,
  canEditOwnScope,
  canViewInvites,
  canReadFinance,
  isGlobalFinance,
  sidebarGroups,
  isGlobalAdmin,
  canEditCms,
  votingEditions,
  children,
}: AppShellProps) {
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
        {persona === 'finance' ? (
          <FinanceSidebar isGlobal={isGlobalFinance} sidebarGroups={sidebarGroups} />
        ) : (
          <AppSidebar
            persona={persona}
            canManageClusters={canManageClusters}
            canManageMemberships={canManageMemberships}
            canReadAudit={canReadAudit}
            canEditOwnScope={canEditOwnScope}
            canViewInvites={canViewInvites}
            canReadFinance={canReadFinance}
            isGlobalAdmin={isGlobalAdmin}
            canEditCms={canEditCms}
            votingEditions={votingEditions}
          />
        )}
        <SidebarInset>
          <Topbar userEmail={userEmail} userName={userName} avatarUrl={avatarUrl} />
          <main className="flex min-h-0 flex-1 flex-col px-6 py-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}
