import { Badge } from '@shesa/ui';

/**
 * Status pill for the payments table. Three orthogonal signals —
 * is-reversal, is-reversed-original, cleared — collapse into a
 * single coloured chip so the outlier row jumps out.
 */
export function TransactionStatusBadge({
  isReversal,
  isReversedOriginal,
}: {
  readonly isReversal: boolean;
  readonly isReversedOriginal: boolean;
}) {
  if (isReversal) {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      >
        Reversal
      </Badge>
    );
  }
  if (isReversedOriginal) {
    return (
      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
        Reversed
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    >
      Cleared
    </Badge>
  );
}
