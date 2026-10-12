/**
 * "Autonomous" chapters carry their own membership + governance; "grouping"
 * chapters are convenience buckets under a parent branch. Autonomous
 * chapters lean primary-coloured to stand out; grouping stays muted.
 */
export function ChapterKindText({ kind }: { readonly kind: 'autonomous' | 'grouping' }) {
  const isAuto = kind === 'autonomous';
  return (
    <span className={isAuto ? 'font-medium text-primary' : 'text-muted-foreground'}>
      {isAuto ? 'Autonomous' : 'Grouping'}
    </span>
  );
}
