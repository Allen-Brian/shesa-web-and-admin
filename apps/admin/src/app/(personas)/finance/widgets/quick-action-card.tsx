import Link from 'next/link';
import { ArrowRight, Wallet } from 'lucide-react';

interface QuickActionCardProps {
  readonly href: string;
  readonly icon: typeof Wallet;
  readonly iconClass: string;
  readonly label: string;
  readonly hint: string;
  readonly badgeCount?: number;
}

/**
 * One tile in the Quick actions grid — bordered card with an icon
 * avatar (in the caller-supplied tone), label, and secondary hint,
 * plus an optional red badge count in the avatar's top-right for
 * queue affordances (e.g. "5 pending approval").
 */
export function QuickActionCard({
  href,
  icon: Icon,
  iconClass,
  label,
  hint,
  badgeCount,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon className="h-4 w-4" />
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
            {badgeCount}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground group-hover:text-primary">
          {label}
        </span>
        <span className="truncate text-xs text-muted-foreground">{hint}</span>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
