import { timelineLabel } from './list-helpers';

export function TimelineCell({
  startAt,
  endAt,
}: {
  readonly startAt: string;
  readonly endAt: string;
}) {
  return <span className="text-sm text-muted-foreground">{timelineLabel(startAt, endAt)}</span>;
}
