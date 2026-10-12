/**
 * Boxed label / big-number / hint tile — the default "vital sign"
 * card used across every reports flavour. GoalHero uses its own
 * `ChargeGoalVital` variant that adds a colour tone.
 */
export function ChargeVitalStat({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-semibold text-foreground tabular-nums">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
