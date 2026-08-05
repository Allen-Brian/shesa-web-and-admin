/**
 * Dashed placeholder rendered inside dashboard panels when a list is
 * empty (no recent articles, no upcoming events, no featured items).
 * Reads as calm instead of alarming — the CMS just hasn't grown into
 * that surface yet.
 */
export function EmptyInline({ label }: { readonly label: string }) {
  return (
    <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center text-xs italic text-muted-foreground">
      {label}
    </p>
  );
}
