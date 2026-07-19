import { Badge } from '@shesa/ui';

const STYLES: Record<string, string> = {
  not_required: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  paid: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  paid_on_behalf: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  waived: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

const LABELS: Record<string, string> = {
  not_required: 'Not required',
  pending: 'Pending',
  paid: 'Paid',
  paid_on_behalf: 'Paid on behalf',
  waived: 'Waived',
};

export function ProfileRegistrationBadge({ state }: { readonly state: string }) {
  return (
    <Badge variant="outline" className={STYLES[state] ?? 'border-border text-foreground'}>
      {LABELS[state] ?? state}
    </Badge>
  );
}
