/**
 * Dashed placeholder card for empty-state slots inside the finance
 * dashboard panels — top treasuries with zero visibility, empty
 * pending queue, no ledger activity, etc.
 */
export function EmptyInline({ label }: { readonly label: string }) {
  return (
    <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center text-xs italic text-muted-foreground">
      {label}
    </p>
  );
}
