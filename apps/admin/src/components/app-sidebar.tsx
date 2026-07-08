'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Badge,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Cog,
  GraduationCap,
  Home,
  Layers,
  MailOpen,
  Megaphone,
  Network,
  ScrollText,
  Settings2,
  Target,
  Users,
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

import { PERSONA_META, type Persona } from '@/lib/personas';

interface AppSidebarProps {
  readonly persona: Persona;
  readonly canManageClusters?: boolean;
  readonly canManageMemberships?: boolean;
  readonly canReadAudit?: boolean;
  readonly canEditOwnScope?: boolean;
  readonly canViewInvites?: boolean;
  /**
   * When the caller holds treasury.read / finance.read anywhere, the
   * admin sidebar surfaces a read-only "Finance" collapsible with the
   * three visibility items the admin should have access to (Charges,
   * Contributions, Obligations) per the 2026-07-06 walkthrough. The
   * money-mover surface (Payments, Expenses, Treasury, Reports) still
   * lives under the /finance persona.
   */
  readonly canReadFinance?: boolean;
  /**
   * True when the caller is a Mainstream (Global) Admin. Hides the
   * Assessments item since a Global Admin IS the imposer, not the
   * receiver, of branch-level levies.
   */
  readonly isGlobalAdmin?: boolean;
}

interface NavItem {
  readonly slug: string;
  readonly label: string;
  readonly Icon: typeof Home;
}

// Clusters that have shipped so far. Order follows the association
// hierarchy — geography (branches + chapters) first, then the
// attribute-based groupings (batches / networks / houses).
const CLUSTER_ITEMS: readonly NavItem[] = [
  { slug: 'branches', label: 'Branches & Chapters', Icon: Building2 },
  { slug: 'batches', label: 'Batches', Icon: GraduationCap },
  { slug: 'networks', label: 'Professional Networks', Icon: Network },
  { slug: 'houses', label: 'Houses', Icon: Badge },
];

// Memberships top-level entries. The 2026-07-05 restructure flattened
// the previous collapsible into two direct links:
//   - Members — the roster.
//   - Manage Membership — a single page with three internal tabs
//     (Requests, Transfers, Registration).
// The scope-slug segment is appended dynamically below when the current
// URL already carries one — so switching between Members and Manage
// Membership stays on the same scope.
const MEMBERSHIP_ITEMS: readonly NavItem[] = [
  { slug: 'members', label: 'Members', Icon: Users },
  { slug: 'manage', label: 'Manage Membership', Icon: Settings2 },
];

/**
 * Extract the scope slug from a Memberships URL, if any. Matches
 *   /[persona]/memberships/[subItem]/[scopeSlug](/...)
 * Returns the scope slug or null. Used to preserve scope selection
 * across sub-item navigation.
 */
function extractMembershipScopeSlug(pathname: string, persona: Persona): string | null {
  const prefix = `/${persona}/memberships/`;
  if (!pathname.startsWith(prefix)) return null;
  const remainder = pathname.slice(prefix.length);
  const parts = remainder.split('/').filter(Boolean);
  // parts = [subItem, scopeSlug?, ...rest]
  if (parts.length < 2) return null;
  return parts[1] ?? null;
}

export function AppSidebar({
  persona,
  canManageClusters = false,
  canManageMemberships = false,
  canReadAudit = false,
  canEditOwnScope = false,
  canViewInvites = false,
  canReadFinance = false,
  isGlobalAdmin = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const meta = PERSONA_META[persona];

  const clustersActive = pathname.startsWith(`/${persona}/clusters`);
  const membershipScope = extractMembershipScopeSlug(pathname, persona);
  const financeActive = pathname.startsWith(`/${persona}/finance-view`);

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <Link
          href={`/${persona}`}
          className="flex h-14 items-center gap-3 overflow-hidden px-1 py-1 font-semibold group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"
        >
          <Logo size={48} className="shrink-0" />
          <div className="flex min-w-0 flex-col leading-tight transition-opacity duration-150 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="truncate whitespace-nowrap text-lg text-primary">Shesa Connect</span>
            <span className="-mt-1 truncate whitespace-nowrap text-xs uppercase tracking-wider text-foreground">
              {meta.portalLabel}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Dashboard"
                  isActive={pathname === `/${persona}`}
                >
                  <Link href={`/${persona}`}>
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canManageMemberships && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {MEMBERSHIP_ITEMS.map(({ slug, label, Icon }) => {
                  const base = `/${persona}/memberships/${slug}`;
                  const href = membershipScope ? `${base}/${membershipScope}` : base;
                  const active = pathname === base || pathname.startsWith(`${base}/`);
                  return (
                    <SidebarMenuItem key={slug}>
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
        )}

        {canManageClusters && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible asChild defaultOpen={clustersActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Clusters" isActive={clustersActive}>
                        <Layers />
                        <span>Clusters</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {CLUSTER_ITEMS.map(({ slug, label, Icon }) => {
                          const href = `/${persona}/clusters/${slug}`;
                          const active = pathname === href || pathname.startsWith(`${href}/`);
                          return (
                            <SidebarMenuSubItem key={slug}>
                              <SidebarMenuSubButton asChild isActive={active}>
                                <Link href={href}>
                                  <Icon />
                                  <span>{label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/*
         * Events + Announcements — flat top-level entries (no sub-nav).
         * RLS on exco.events + exco.announcements gates visibility per
         * ADR-0041; the list pages render an empty state for anyone
         * without admin scopes rather than hiding the link.
         */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Events"
                  isActive={
                    pathname === `/${persona}/events` || pathname.startsWith(`/${persona}/events/`)
                  }
                >
                  <Link href={`/${persona}/events`}>
                    <CalendarDays />
                    <span>Events</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Announcements"
                  isActive={
                    pathname === `/${persona}/announcements` ||
                    pathname.startsWith(`/${persona}/announcements/`)
                  }
                >
                  <Link href={`/${persona}/announcements`}>
                    <Megaphone />
                    <span>Announcements</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/*
         * Finance visibility — READ-ONLY. Admins (Global + Branch) can
         * see Charges, Contributions, and Obligations at scopes they
         * have finance-read at. The money-mover surface (Payments,
         * Expenses, Treasury, Reports) still lives under the /finance
         * persona; those are Finance-role territory.
         *
         * This collapsible is deliberately narrower than the finance
         * persona's own sidebar — the admin should be able to SEE what
         * money's coming in and out but not touch it.
         */}
        {canReadFinance && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible asChild defaultOpen={financeActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Finance" isActive={financeActive}>
                        <Wallet />
                        <span>Finance</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname.startsWith(`/${persona}/finance-view/charges`)}
                          >
                            <Link href={`/${persona}/finance-view/charges`}>
                              <BadgeDollarSign />
                              <span>Charges</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname.startsWith(`/${persona}/finance-view/contributions`)}
                          >
                            <Link href={`/${persona}/finance-view/contributions`}>
                              <Target />
                              <span>Contributions</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {!isGlobalAdmin && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname.startsWith(`/${persona}/finance-view/assessments`)}
                            >
                              <Link href={`/${persona}/finance-view/assessments`}>
                                <ClipboardList />
                                <span>Assessments</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/*
         * Settings — scoped edit + governance for a branch or autonomous
         * chapter. Global mainstream_admin qualifies via has_permission's
         * NULL-scope pass at Mainstream. Uses `Cog` to distinguish from
         * the Memberships "Manage Membership" (Settings2) entry above.
         */}
        {(canEditOwnScope || canReadAudit || canViewInvites) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {canEditOwnScope && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Settings"
                      isActive={pathname.startsWith(`/${persona}/settings`)}
                    >
                      <Link href={`/${persona}/settings`}>
                        <Cog />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {canViewInvites && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Invites"
                      isActive={pathname.startsWith(`/${persona}/invites`)}
                    >
                      <Link href={`/${persona}/invites`}>
                        <MailOpen />
                        <span>Invites</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {canReadAudit && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Audit Logs"
                      isActive={pathname.startsWith(`/${persona}/audit-logs`)}
                    >
                      <Link href={`/${persona}/audit-logs`}>
                        <ScrollText />
                        <span>Audit Logs</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
