'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BarChart, HandCoins, Home, TextAlignJustify, Ticket, Wallet } from 'lucide-react';

import type { GroupSubNavItem } from '@/lib/finance/groups/load-group';

interface GroupSubNavProps {
  readonly slug: string;
  readonly contributions: readonly GroupSubNavItem[];
  /**
   * Optional trailing slot (used by the layout to inject a "+ Add
   * contribution" trigger). Kept as ReactNode so this client component
   * doesn't need to know about the dialog it hosts.
   */
  readonly trailing?: ReactNode;
}

const BASE_ITEMS = [
  { key: '', label: 'Dashboard', Icon: Home },
  { key: 'transactions', label: 'Transactions', Icon: TextAlignJustify },
] as const;

const LATE_ITEMS = [
  { key: 'donations', label: 'Donations', Icon: HandCoins },
  { key: 'expenses', label: 'Expenses', Icon: Wallet },
  { key: 'reports', label: 'Reports', Icon: BarChart },
] as const;

/**
 * Horizontal tab strip that lives under the group hero. Contributions
 * sit between Transactions and Donations so a group with two ticket
 * types (say) reads as "Dashboard · Transactions · Tickets · Attire ·
 * Donations · …" — one continuous row instead of a hidden sub-row.
 * The "+ Add contribution" trigger tucks in on the right so operators
 * can add new tabs on demand.
 */
export function GroupSubNav({ slug, contributions, trailing }: GroupSubNavProps) {
  const pathname = usePathname();
  const base = `/finance/groups/${slug}`;

  const renderTab = (href: string, label: string, Icon: typeof Home, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ' +
        (active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground')
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b pb-3">
      {BASE_ITEMS.map(({ key, label, Icon }) => {
        const href = key ? `${base}/${key}` : base;
        const active = key ? pathname.startsWith(href) : pathname === base;
        return renderTab(href, label, Icon, active);
      })}

      {contributions.map((c) => {
        const href = `${base}/contributions/${c.chargeId}`;
        const active = pathname === href;
        return renderTab(href, c.name, Ticket, active);
      })}

      {LATE_ITEMS.map(({ key, label, Icon }) => {
        const href = `${base}/${key}`;
        const active = pathname.startsWith(href);
        return renderTab(href, label, Icon, active);
      })}

      {trailing && <div className="ml-auto flex items-center">{trailing}</div>}
    </nav>
  );
}
