'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart, HandCoins, Home, Landmark, TextAlignJustify, Wallet } from 'lucide-react';

import type { GroupSubNavItem } from '@/lib/finance/groups/load-group';

interface GroupSubNavProps {
  readonly slug: string;
  readonly contributions: readonly GroupSubNavItem[];
}

const BASE_ITEMS = [
  { key: '', label: 'Dashboard', Icon: Home },
  { key: 'transactions', label: 'Transactions', Icon: TextAlignJustify },
  { key: 'donations', label: 'Donations', Icon: HandCoins },
  { key: 'expenses', label: 'Expenses', Icon: Wallet },
  { key: 'reports', label: 'Reports', Icon: BarChart },
] as const;

/**
 * Horizontal tab strip that lives under the group hero. Fixed base
 * items (Dashboard / Transactions / Donations / Expenses / Reports)
 * plus a dynamic Contributions row generated from the group's ticketed
 * + fixed charges. Each contribution links to the same charge-detail
 * page the mainstream list would open, so nothing forks.
 */
export function GroupSubNav({ slug, contributions }: GroupSubNavProps) {
  const pathname = usePathname();
  const base = `/finance/groups/${slug}`;

  return (
    <nav className="flex flex-col gap-2 border-b pb-3">
      <div className="flex flex-wrap items-center gap-1">
        {BASE_ITEMS.map(({ key, label, Icon }) => {
          const href = key ? `${base}/${key}` : base;
          const active = key ? pathname.startsWith(href) : pathname === base;
          return (
            <Link
              key={key || 'dashboard'}
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
        })}
      </div>
      {contributions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Landmark className="h-3 w-3" /> Contributions
          </span>
          {contributions.map((c) => {
            const href = `${base}/contributions/${c.chargeId}`;
            const active = pathname === href;
            return (
              <Link
                key={c.chargeId}
                href={href}
                className={
                  'rounded-md border px-2 py-0.5 text-xs transition ' +
                  (active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground')
                }
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
