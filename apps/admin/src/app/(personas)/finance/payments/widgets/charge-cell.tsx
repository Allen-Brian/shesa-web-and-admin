import { BadgeDollarSign, CircleDollarSign, Target } from 'lucide-react';

/**
 * "For" column cell — icon-avatar keyed to the charge shape (target
 * for goals, circle-dollar for fixed, badge-dollar for other) + name
 * + `scope · shape` subtitle. Same shape as the analogous cell on
 * the charge-detail matrix.
 */
export function ChargeCell({
  chargeName,
  chargeShape,
  scopeName,
}: {
  readonly chargeName: string;
  readonly chargeShape: string | null;
  readonly scopeName: string;
}) {
  const ShapeIcon =
    chargeShape === 'goal' ? Target : chargeShape === 'fixed' ? CircleDollarSign : BadgeDollarSign;
  return (
    <div className="flex h-full items-center gap-2.5 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <ShapeIcon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{chargeName}</span>
        {chargeShape && (
          <span className="truncate text-xs text-muted-foreground">
            {scopeName} · {chargeShape}
          </span>
        )}
      </div>
    </div>
  );
}
