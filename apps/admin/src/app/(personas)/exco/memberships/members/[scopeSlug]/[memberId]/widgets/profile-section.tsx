import type { ReactNode } from 'react';

interface ProfileSectionProps {
  readonly title: string;
  readonly children: ReactNode;
}

/**
 * Section card used in the left + right rails of the member profile.
 * Just a titled Card with a vertical child list.
 */
export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
