import { Badge } from '@shesa/ui';

/**
 * Coloured pill for a CMS article's status — draft is neutral,
 * scheduled amber, published emerald, archived destructive. Reused
 * across the dashboard's recent-articles panel and (potentially) the
 * News list column.
 */
export function ArticleStatusBadge({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    draft: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    scheduled: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    published: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    archived: 'border-destructive/40 bg-destructive/10 text-destructive',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border text-foreground'}>
      {label}
    </Badge>
  );
}
