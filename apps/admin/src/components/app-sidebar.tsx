'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Badge,
  Building2,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Home,
  Inbox,
  Layers,
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
const MEMBERSHIP_ITEMS: readonly NavItem[] = [
  { slug: 'members', label: 'Members', Icon: Users },
  { slug: 'requests-transfers', label: 'Requests & Transfers', Icon: Inbox },
  { slug: 'registration', label: 'Registration', Icon: ClipboardCheck },
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
                        {MEMBERSHIP_ITEMS.map(({ slug, label, Icon }) => {
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
      </SidebarContent>
    </Sidebar>
  );
}
