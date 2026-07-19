import { formatTimeOnly } from './helpers';

export function TimeCell({ iso }: { readonly iso: string }) {
  return <span className="text-xs text-foreground tabular-nums">{formatTimeOnly(iso)}</span>;
}
