/**
 * Dashed placeholder for an empty slot inside a dashboard panel — no
 * recent articles, no upcoming events, an empty pending queue, a
 * treasury with no visible activity.
 *
 * Reads as calm rather than alarming: the surface simply has nothing in
 * it yet, which is not an error state.
 *
 * Shared by the Editor and Finance dashboards, which each carried a
 * byte-identical copy differing only in the doc comment.
 */
export function EmptyInline({ label }: { readonly label: string }) {
  return (
    <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center text-xs italic text-muted-foreground">
      {label}
    </p>
  );
}
