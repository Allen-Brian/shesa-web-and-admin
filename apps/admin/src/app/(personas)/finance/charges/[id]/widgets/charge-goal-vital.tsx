/**
 * Small numeric tile inside the GoalHero's vital-signs grid. Kept
 * separate from the shared VitalStat because it also takes a `tone`
 * for the "days-left → amber" and "goal-hit → emerald" accents.
 */
export function ChargeGoalVital({
  label,
  value,
  hint,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly tone: 'default' | 'emerald' | 'amber' | 'destructive';
}) {
  const toneClass: Record<typeof tone, string> = {
    default: 'text-foreground',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    destructive: 'text-destructive',
  };
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${toneClass[tone]}`}>{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
