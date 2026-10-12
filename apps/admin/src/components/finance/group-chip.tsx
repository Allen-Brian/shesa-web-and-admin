import { CalendarClock } from 'lucide-react';

import { Badge } from '@shesa/ui';

interface GroupChipProps {
  readonly name: string;
}

/**
 * Small "AGM 2026" badge shown on rows tied to an event group.
 * Rendered inline in Donations, Expenses, and Transactions cells so
 * an operator can spot an event's rows in the mainstream list without
 * pivoting into the group view. Renders nothing when name is empty.
 */
export function GroupChip({ name }: GroupChipProps) {
  if (!name) return null;
  return (
    <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
      <CalendarClock className="h-3 w-3" aria-hidden />
      {name}
    </Badge>
  );
}
