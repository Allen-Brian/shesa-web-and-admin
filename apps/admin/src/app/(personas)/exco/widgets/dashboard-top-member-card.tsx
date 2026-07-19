import Link from 'next/link';

import type { TopMember } from './dashboard-types';

interface DashboardTopMemberCardProps {
  readonly member: TopMember;
  readonly rank: number;
}

export function DashboardTopMemberCard({ member, rank }: DashboardTopMemberCardProps) {
  const inner = (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-background/70">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {rank}
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{member.name}</span>
        <span className="truncate text-[11px] text-muted-foreground">
          {[member.city, member.country].filter(Boolean).join(', ') || 'Location unknown'}
        </span>
        <span className="text-[10px] font-medium tabular-nums text-primary">
          score {member.score}
        </span>
      </div>
    </div>
  );

  if (!member.scopeSlug) return inner;
  return (
    <Link href={`/exco/memberships/members/${member.scopeSlug}/${member.id}`} className="block">
      {inner}
    </Link>
  );
}
