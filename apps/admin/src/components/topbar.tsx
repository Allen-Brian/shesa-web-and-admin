'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, User } from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarTrigger,
  Skeleton,
  ThemeToggle,
} from '@shesa/ui';

import { UUID_PATTERN, useBreadcrumb } from '@/components/breadcrumb-context';

interface Crumb {
  label: string | null;
  href?: string;
  pending?: boolean;
}

const SEGMENT_LABELS: Record<string, string> = {
  exco: 'Admin',
  finance: 'Finance',
  editor: 'Editor',
  dashboard: 'Dashboard',
  members: 'Members',
  memberships: 'Memberships',
  roles: 'Roles',
  positions: 'Positions',
  events: 'Events',
  audit: 'Audit Log',
  contributions: 'Contributions',
  reports: 'Reports',
  announcements: 'Announcements',
  pages: 'Pages',
  media: 'Media Library',
  voting: 'Voting',
  awards: 'Awards',
  ballots: 'Ballots',
  results: 'Results',
  new: 'New',
  edit: 'Edit',
};

function deriveCrumbs(pathname: string, overrides: Record<string, string>): Crumb[] {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [];
  const crumbs: Crumb[] = [];
  let href = '';
  parts.forEach((seg, idx) => {
    href += '/' + seg;
    const isLast = idx === parts.length - 1;
    const override = overrides[seg];
    const isId = UUID_PATTERN.test(seg);
    let label: string | null;
    let pending = false;
    if (override) {
      label = override;
    } else if (isId) {
      label = null;
      pending = true;
    } else {
      label = SEGMENT_LABELS[seg] ?? decodeURIComponent(seg).replace(/-/g, ' ');
    }
    crumbs.push({ label, href: isLast ? undefined : href, pending });
  });
  return crumbs;
}

interface TopbarProps {
  readonly userEmail: string;
  readonly userName: string;
  readonly avatarUrl?: string;
}

export function Topbar({ userEmail, userName, avatarUrl }: TopbarProps) {
  const pathname = usePathname();
  const { labels } = useBreadcrumb();
  const crumbs = deriveCrumbs(pathname, labels);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-1 bg-background/85 px-6 backdrop-blur">
      <SidebarTrigger className="h-9 w-9" />

      <Breadcrumb className="min-w-0 mr-4">
        <BreadcrumbList className="text-sm">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            const labelNode = c.pending ? (
              <Skeleton className="inline-block h-4 w-24 align-middle" />
            ) : (
              c.label
            );
            return (
              <span key={`${c.href ?? 'crumb'}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast || !c.href ? (
                    <BreadcrumbPage>{labelNode}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={c.href}>{labelNode}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationsButton />
        <ProfileMenu email={userEmail} name={userName} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}

function NotificationsButton() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
    >
      <Bell className="h-5 w-5" />
      <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
    </button>
  );
}

interface ProfileMenuProps {
  readonly name: string;
  readonly email: string;
  readonly avatarUrl?: string;
}

function ProfileMenu({ name, email, avatarUrl }: ProfileMenuProps) {
  const router = useRouter();

  const initials =
    name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  async function onLogout() {
    // Logout is POST-only per apps/admin/src/app/(auth)/logout/route.ts.
    // `redirect: 'manual'` stops fetch from chasing the 303 → /login and
    // loading that page server-side — the response headers (with the
    // session-clearing Set-Cookie) are all we need before we navigate.
    await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
    });
    router.replace('/login');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Avatar className="h-8 w-8 bg-accent">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium md:inline">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3">
          <Avatar className="h-10 w-10">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/me/security">
            <User /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
