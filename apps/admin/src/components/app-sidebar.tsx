'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Badge,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Home,
  Inbox,
  Layers,
  Megaphone,
  Network,
  Users,
  UsersRound,
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
  /**
   * True when the current user has membership access at any BRANCH-LIKE
   * scope (branch or autonomous chapter). Only branch-like scopes carry
   * join requests, transfers, and registration fees — batch admins
   * (batch-only grants) never need those sub-items in the sidebar.
   */
  readonly hasBranchLikeMembership?: boolean;
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

// Memberships sub-items. Each links to /[persona]/memberships/[slug](/scope).
// The scope-slug segment is appended dynamically below when the current
// URL already carries one — so navigating Members → Registration stays
// on the same scope.
//
// `branchLikeOnly` sub-items only render for users who have a
// branch-or-autonomous-chapter grant — batch-only admins don't see
// Requests & Transfers or Registration since batches don't hold either.
const MEMBERSHIP_ITEMS: readonly (NavItem & { readonly branchLikeOnly?: boolean })[] = [
  { slug: 'members', label: 'Members', Icon: Users },
  { slug: 'requests-transfers', label: 'Requests & Transfers', Icon: Inbox, branchLikeOnly: true },
  { slug: 'registration', label: 'Registration', Icon: ClipboardCheck, branchLikeOnly: true },
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
  hasBranchLikeMembership = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const meta = PERSONA_META[persona];

  const clustersActive = pathname.startsWith(`/${persona}/clusters`);
  const membershipsActive = pathname.startsWith(`/${persona}/memberships`);
  const membershipScope = extractMembershipScopeSlug(pathname, persona);

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
        {canManageMemberships && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible asChild defaultOpen={membershipsActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Memberships" isActive={membershipsActive}>
                        <UsersRound />
                        <span>Memberships</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {MEMBERSHIP_ITEMS.filter(
                          (item) => !item.branchLikeOnly || hasBranchLikeMembership,
                        ).map(({ slug, label, Icon }) => {
                          const base = `/${persona}/memberships/${slug}`;
                          const href = membershipScope ? `${base}/${membershipScope}` : base;
                          const active = pathname === base || pathname.startsWith(`${base}/`);
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
      </SidebarContent>
    </Sidebar>
  );
}
