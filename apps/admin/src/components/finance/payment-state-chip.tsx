import { CircleDashed, ShieldCheck } from 'lucide-react';

/**
 * The one place a payment's state is drawn.
 *
 * A payment carries two facts that are often confused for one:
 *
 *   settlement    — did the money land, and is this row a reversal or
 *                   an original that has since been reversed?
 *   reconciliation — has a human matched it against the gateway or bank
 *                   statement?
 *
 * They are genuinely independent: a reversal can be reconciled, and a
 * cleared payment can sit unreconciled for weeks. Collapsing them into
 * a single word would make one of them unreadable, and giving them two
 * separate columns — which is what Transactions used to do — made the
 * table wider without making it clearer, and left "unreconciled"
 * showing as a bare em dash that read as missing data rather than as a
 * state.
 *
 * So: one chip, two registers. The pill carries the settlement word in
 * its colour; the seal clipped to its right edge carries reconciliation
 * — solid shield when matched, dashed ring when still outstanding. The
 * same component renders in every table and in the detail sheet, so the
 * state looks identical wherever the operator meets it.
 */

export type SettlementState = 'cleared' | 'reversal' | 'reversed';

const SETTLEMENT: Record<
  SettlementState,
  { readonly label: string; readonly pill: string; readonly dot: string }
> = {
  cleared: {
    label: 'Cleared',
    pill: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  reversal: {
    label: 'Reversal',
    pill: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  reversed: {
    label: 'Reversed',
    pill: 'border-destructive/40 bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
};

/**
 * Resolves the two booleans the tables carry into one settlement state,
 * so no caller has to remember that "is a reversal" wins over "has been
 * reversed".
 */
export function settlementOf(isReversal: boolean, isReversedOriginal: boolean): SettlementState {
  if (isReversal) return 'reversal';
  if (isReversedOriginal) return 'reversed';
  return 'cleared';
}

interface Props {
  readonly settlement: SettlementState;
  readonly reconciled: boolean;
  /** Shown in the seal's tooltip when present. */
  readonly reconciledAt?: string | null;
  /**
   * Drop the reconciliation seal. For surfaces that show payments which
   * cannot be reconciled at all (gateway attempts, sandbox runs), where
   * a permanently-dashed ring would read as a backlog.
   */
  readonly hideSeal?: boolean;
  readonly className?: string;
}

export function PaymentStateChip({
  settlement,
  reconciled,
  reconciledAt,
  hideSeal = false,
  className,
}: Props) {
  const tone = SETTLEMENT[settlement];
  const sealTitle = reconciled
    ? reconciledAt
      ? `Reconciled · ${new Date(reconciledAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}`
      : 'Reconciled'
    : 'Not yet reconciled';

  return (
    <span className={`inline-flex items-center ${className ?? ''}`}>
      <span
        title={`${tone.label}${hideSeal ? '' : ` · ${sealTitle}`}`}
        className={`inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-2 text-xs font-semibold ${
          hideSeal ? 'pr-2.5' : 'pr-1.5'
        } ${tone.pill}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
        {tone.label}
        {!hideSeal &&
          (reconciled ? (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <CircleDashed className="h-3.5 w-3.5 shrink-0 opacity-45" aria-hidden />
          ))}
      </span>
      {!hideSeal && <span className="sr-only">{sealTitle}</span>}
    </span>
  );
}

/**
 * The seal on its own, for places that already say what the settlement
 * is in words and only need the reconciliation half — the detail
 * sheet's reconciliation section, for one.
 */
export function ReconciliationSeal({
  reconciled,
  reconciledAt,
}: {
  readonly reconciled: boolean;
  readonly reconciledAt?: string | null;
}) {
  return reconciled ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Reconciled
      {reconciledAt && (
        <span className="font-normal opacity-70">
          {new Date(reconciledAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
        </span>
      )}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      <CircleDashed className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      Unreconciled
    </span>
  );
}
