'use client';

import { ExcoBadge, type ExcoBadgeInfo } from './exco-badge';

interface MemberNameProps {
  readonly name: string;
  readonly badge?: ExcoBadgeInfo | null;
  readonly className?: string;
}

/**
 * The canonical way to render a member's name in the admin app. When
 * a badge is provided (member holds a position at some scope), it
 * renders inline just after the name — that's the "everywhere his name
 * appears" contract from the 2026-07-03 governance spec.
 */
export function MemberName({ name, badge, className }: MemberNameProps) {
  if (!badge) return <span className={className}>{name}</span>;
  return (
    <span className={className}>
      <span className="inline-flex items-center gap-1.5 align-middle">
        <span>{name}</span>
        <ExcoBadge info={badge} />
      </span>
    </span>
  );
}
