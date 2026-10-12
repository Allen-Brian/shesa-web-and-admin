import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

import type { WindowFilter } from './audit-log-widget-types';

export function WindowSelect({
  value,
  onChange,
}: {
  readonly value: WindowFilter;
  readonly onChange: (v: WindowFilter) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as WindowFilter)}>
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="24h">Last 24h</SelectItem>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="all">All in view</SelectItem>
      </SelectContent>
    </Select>
  );
}
