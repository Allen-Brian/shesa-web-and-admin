import Link from 'next/link';
import { ArrowRight, Wallet } from 'lucide-react';

interface EditorQuickActionCardProps {
  readonly href: string;
  readonly icon: typeof Wallet;
  readonly iconClass: string;
  readonly label: string;
  readonly hint: string;
}

/**
 * One tile in the Editor's Quick actions grid — bordered card with a
 * tinted icon avatar, label, and secondary hint. The right-arrow icon
 * animates on hover so the card reads as an entry point rather than a
 * KPI.
 */
export function EditorQuickActionCard({
  href,
  icon: Icon,
  iconClass,
  label,
  hint,
}: EditorQuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon className="h-4 w-4" />
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
