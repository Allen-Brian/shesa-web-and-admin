import { Badge } from '@shesa/ui';

/**
 * Coloured pill for a charge or campaign's lifecycle stage.
 *
 * Draft = muted, open = emerald, closed = amber, archived = destructive.
 * An unknown or null value falls back to the plain border chip rather
 * than rendering blank, so a new lifecycle value is visible instead of
 * silently invisible.
 *
 * Shared by Contributions and Donations, which each carried a copy with
 * a byte-identical body.
 */
export function LifecycleBadge({ value }: { readonly value: string | null }) {
  const styles: Record<string, string> = {
    draft: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    open: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    closed: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    archived: 'border-destructive/40 bg-destructive/10 text-destructive',
  };
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
  return (
    <Badge variant="outline" className={value ? styles[value] : 'border-border text-foreground'}>
      {label}
    </Badge>
  );
}
