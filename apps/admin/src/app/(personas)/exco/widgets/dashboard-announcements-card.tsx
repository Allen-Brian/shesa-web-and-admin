import Link from 'next/link';
import { Bell } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { DashboardEmptyBlock } from './dashboard-empty-block';
import { formatRelativeShort } from '@/lib/format/relative-time';
import type { AnnouncementItem } from './dashboard-types';

export function DashboardAnnouncementsCard({
  items,
}: {
  readonly items: readonly AnnouncementItem[];
}) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Bell className="h-4 w-4 text-primary" />
            Active announcements
          </h2>
          <p className="text-xs text-muted-foreground">Recently published across your scope</p>
        </div>
        <Link
          href="/exco/announcements"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </div>
      {items.length === 0 ? (
        <DashboardEmptyBlock label="Nothing published lately." />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((a) => (
            <li key={a.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{a.title}</span>
                {a.publishedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeShort(a.publishedAt)}
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
              <span className="mt-1 block text-[10px] text-muted-foreground">{a.scopeName}</span>
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}
