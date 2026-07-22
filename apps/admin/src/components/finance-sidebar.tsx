'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeDollarSign,
  BarChart3,
  CircleDollarSign,
  Home,
  LandPlot,
  Target,
  Wallet,
} from 'lucide-react';
// Wallet retained (still used for the Expenses icon).

import {
  Logo,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@shesa/ui';

import { PERSONA_META } from '@/lib/personas';

interface FinanceSidebarProps {
  /**
   * When the finance user has NULL-scope grant (Global Finance), they see
   * every treasury. This flag tells the shell to render the "Global" chip
   * beside the persona label so operators immediately know the reach of
   * what they're seeing.
   */
  readonly isGlobal?: boolean;
}

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly Icon: typeof Home;
}

/**
 * Flat sidebar per 2026-07-06 direction — no grouping. Order follows the
 * secretary's read-order per spec Part XIV.
 *
 * Receipts intentionally aren't a top-level entry: every payment carries
 * its receipt inline (Payments row → More → Download receipt). Keeping
 * a separate Receipts page duplicated the payments list without adding
 * anything callers actually asked for.
 */
const NAV_ITEMS: readonly NavItem[] = [
  { href: '/finance', label: 'Dashboard', Icon: Home },
  { href: '/finance/payments', label: 'Transactions', Icon: LandPlot },
  { href: '/finance/charges', label: 'Charges', Icon: BadgeDollarSign },
  { href: '/finance/contributions', label: 'Contributions', Icon: Target },
  { href: '/finance/donations', label: 'Donations', Icon: CircleDollarSign },
  { href: '/finance/expenses', label: 'Expenses', Icon: Wallet },
  { href: '/finance/reports', label: 'Reports', Icon: BarChart3 },
];

export function FinanceSidebar({ isGlobal = false }: FinanceSidebarProps) {
  const pathname = usePathname();
  const meta = PERSONA_META.finance;

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
      </SidebarContent>
    </Sidebar>
  );
}
