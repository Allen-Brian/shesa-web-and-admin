'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart,
  CalendarClock,
  Activity,
  CreditCard,
  FlaskConical,
  HandCoins,
  Home,
  Landmark,
  TextAlignJustify,
  Wallet,
} from 'lucide-react';

import {
  Logo,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@shesa/ui';

import type { SidebarGroupItem } from '@/lib/finance/groups/load-sidebar-groups';
import { PERSONA_META } from '@/lib/personas';

interface FinanceSidebarProps {
  /**
   * When the finance user has NULL-scope grant (Global Finance), they see
   * every treasury. This flag tells the shell to render the "Global" chip
   * beside the persona label so operators immediately know the reach of
   * what they're seeing.
   */
  readonly isGlobal?: boolean;
  /**
   * Event groups the caller can see and that the group manager has
   * opted into the sidebar. Empty for branch finance users (RLS
   * filters them out) — the Event Groups section hides entirely then.
   */
  readonly sidebarGroups?: readonly SidebarGroupItem[];
}

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly Icon: typeof Home;
}

/**
 * Three sections: the mainstream Finance nav, an "Event Groups" section
 * listing groups the caller can see, and "Testing".
 *
 * Testing is its own group rather than an item in the main nav because
 * what it holds is not part of the books. `finance.sandbox_payments`
 * writes no ledger entry, moves no treasury balance and mints no receipt,
 * and nothing above it reads that table. Filing it beside Transactions
 * would invite exactly the confusion the separate table exists to
 * prevent.
 *
 * The Event Groups section hides entirely when `sidebarGroups` is empty
 * (branch finance users have no groups) so the mainstream nav stays clean.
 */
const NAV_ITEMS: readonly NavItem[] = [
  { href: '/finance', label: 'Dashboard', Icon: Home },
  { href: '/finance/transactions', label: 'Transactions', Icon: TextAlignJustify },
  { href: '/finance/payment-attempts', label: 'Payment attempts', Icon: Activity },
  { href: '/finance/charges', label: 'Charges', Icon: CreditCard },
  { href: '/finance/contributions', label: 'Contributions', Icon: Landmark },
  { href: '/finance/donations', label: 'Donations', Icon: HandCoins },
  { href: '/finance/expenses', label: 'Expenses', Icon: Wallet },
  { href: '/finance/reports', label: 'Reports', Icon: BarChart },
];

const TESTING_ITEMS: readonly NavItem[] = [
  { href: '/finance/sandbox-payments', label: 'Sandbox payments', Icon: FlaskConical },
];

export function FinanceSidebar({ isGlobal = false, sidebarGroups = [] }: FinanceSidebarProps) {
  const pathname = usePathname();
  const meta = PERSONA_META.finance;
  // Show the Event Groups section for mainstream users (isGlobal) even
  // when they have no groups yet — otherwise they can't navigate to
  // /finance/groups to create the first one. Branch finance users only
  // see the section when they actually have visible groups, which RLS
  // filters down to nothing for them today.
  const showGroups = isGlobal || sidebarGroups.length > 0;
  const groupsActive = pathname === '/finance/groups' || pathname.startsWith('/finance/groups/');

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <Link
          href="/finance"
          className="flex h-14 items-center gap-3 overflow-hidden px-1 py-1 font-semibold group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"
        >
          <Logo size={48} className="shrink-0" />
          <div className="flex min-w-0 flex-col leading-tight transition-opacity duration-150 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="truncate whitespace-nowrap text-lg text-primary">Shesa Connect</span>
            <span className="-mt-1 truncate whitespace-nowrap text-xs uppercase tracking-wider text-foreground">
              {meta.portalLabel}
              {isGlobal && (
                <span className="ml-1 rounded bg-primary/10 px-1 text-[10px] text-primary">
                  Global
                </span>
              )}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ href, label, Icon }) => {
                const active =
                  href === '/finance'
                    ? pathname === '/finance'
                    : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild tooltip={label} isActive={active}>
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showGroups && (
          <SidebarGroup>
            <SidebarGroupLabel>Event Groups</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="All groups"
                    isActive={pathname === '/finance/groups'}
                  >
                    <Link href="/finance/groups">
                      <CalendarClock />
                      <span>All groups</span>
                    </Link>
                  </SidebarMenuButton>
                  {groupsActive && sidebarGroups.length > 0 && (
                    <SidebarMenuSub>
                      {sidebarGroups.map((g) => {
                        const href = `/finance/groups/${g.slug}`;
                        const active = pathname === href || pathname.startsWith(`${href}/`);
                        return (
                          <SidebarMenuSubItem key={g.id}>
                            <SidebarMenuSubButton asChild isActive={active}>
                              <Link href={href}>
                                <span className="truncate">{g.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Testing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TESTING_ITEMS.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild tooltip={label} isActive={active}>
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
