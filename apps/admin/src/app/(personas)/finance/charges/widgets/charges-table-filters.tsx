'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

import type { ShapeFilter, StatusFilter } from './charges-types';

interface ChargesTableFiltersProps {
  readonly shape: ShapeFilter;
  readonly onShapeChange: (v: ShapeFilter) => void;
  readonly status: StatusFilter;
  readonly onStatusChange: (v: StatusFilter) => void;
}

/**
 * Shape + status two-select cluster rendered in the
 * EntityTablePanel's filters slot. Kept as a widget so the
 * orchestrator doesn't inline half a page of Select JSX.
 */
export function ChargesTableFilters({
  shape,
  onShapeChange,
  status,
  onStatusChange,
}: ChargesTableFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={shape} onValueChange={(v) => onShapeChange(v as ShapeFilter)}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All shapes</SelectItem>
          <SelectItem value="charge">Charge</SelectItem>
          <SelectItem value="fixed">Fixed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="paused">Paused</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
