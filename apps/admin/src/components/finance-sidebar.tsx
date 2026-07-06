'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeDollarSign,
  BarChart3,
  ChevronRight,
  CircleDollarSign,
  Home,
  LandPlot,
  Receipt,
  ReceiptText,
  Target,
  Wallet,
} from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Logo,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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

interface FlatItem {
  readonly href: string;
  readonly label: string;
  readonly Icon: typeof Home;
}

// Sub-items under the "Money in" collapsible. Charges + Contributions +
// Donations all live under finance.charges (one primitive per spec), but
// the secretary reads them as three different tasks — the group lets us
// hide the shared plumbing.
const MONEY_IN_ITEMS: readonly FlatItem[] = [
  { href: '/finance/charges', label: 'Charges', Icon: BadgeDollarSign },
  { href: '/finance/contributions', label: 'Contributions', Icon: Target },
  { href: '/finance/donations', label: 'Donations', Icon: CircleDollarSign },
];

const MONEY_OUT_ITEMS: readonly FlatItem[] = [
  { href: '/finance/expenses', label: 'Expenses', Icon: Wallet },
];

const OPERATIONS_ITEMS: readonly FlatItem[] = [
  { href: '/finance/payments', label: 'Payments', Icon: LandPlot },
  { href: '/finance/receipts', label: 'Receipts', Icon: Receipt },
];

const INSIGHT_ITEMS: readonly FlatItem[] = [
  { href: '/finance/treasury', label: 'Treasury', Icon: Wallet },
  { href: '/finance/reports', label: 'Reports', Icon: BarChart3 },
];

/**
 * Finance persona sidebar.
 *
 * Grouped by task-flavor per spec Part XIV:
 *   Dashboard
 *   Money In    — Charges / Contributions / Donations
 *   Money Out   — Expenses
 *   Operations  — Payments / Receipts
 *   Insight     — Treasury / Reports
 *
 * The exposed labels are TASKS, never primitives (no "Obligations,"
 * no "Ledger," no "Journals") — spec rule: if a screen would make a
 * non-accountant hesitate, it's exposing the engine instead of the
 * task. Obligations surface inside Charges (who's paid) and Reports
 * (arrears); ledger + journals surface inside Treasury (statement).
 */
export function FinanceSidebar({ isGlobal = false }: FinanceSidebarProps) {
  const pathname = usePathname();
  const meta = PERSONA_META.finance;

  const isMoneyInActive = MONEY_IN_ITEMS.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  const isMoneyOutActive = MONEY_OUT_ITEMS.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  const isOperationsActive = OPERATIONS_ITEMS.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  const isInsightActive = INSIGHT_ITEMS.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

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
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard" isActive={pathname === '/finance'}>
                  <Link href="/finance">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavCollapsible
                label="Money in"
                Icon={BadgeDollarSign}
                items={MONEY_IN_ITEMS}
                pathname={pathname}
                defaultOpen={isMoneyInActive}
              />
              <NavCollapsible
                label="Money out"
                Icon={Wallet}
                items={MONEY_OUT_ITEMS}
                pathname={pathname}
                defaultOpen={isMoneyOutActive}
              />
              <NavCollapsible
                label="Operations"
                Icon={ReceiptText}
                items={OPERATIONS_ITEMS}
                pathname={pathname}
                defaultOpen={isOperationsActive}
              />
              <NavCollapsible
                label="Insight"
                Icon={BarChart3}
                items={INSIGHT_ITEMS}
                pathname={pathname}
                defaultOpen={isInsightActive}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

interface NavCollapsibleProps {
  readonly label: string;
  readonly Icon: typeof Home;
  readonly items: readonly FlatItem[];
  readonly pathname: string;
  readonly defaultOpen: boolean;
}

function NavCollapsible({ label, Icon, items, pathname, defaultOpen }: NavCollapsibleProps) {
  return (
    <Collapsible asChild defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={label} isActive={defaultOpen}>
            <Icon />
            <span>{label}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map(({ href, label: sublabel, Icon: SubIcon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <SidebarMenuSubItem key={href}>
                  <SidebarMenuSubButton asChild isActive={active}>
                    <Link href={href}>
                      <SubIcon />
                      <span>{sublabel}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
