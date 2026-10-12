import { Badge } from '@shesa/ui';

const STYLES: Record<string, string> = {
  dormant: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
  normal: 'border-border bg-background text-foreground',
  engaged: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  committed: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  pillar: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

export function ProfileEngagementBadge({ tier }: { readonly tier: string }) {
  return (
    <Badge variant="outline" className={`w-fit ${STYLES[tier] ?? 'border-border text-foreground'}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}
