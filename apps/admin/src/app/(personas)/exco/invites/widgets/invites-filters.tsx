'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

import type { BatchOption, ClaimStatus } from './invite-widget-types';

export type StatusFilter = '__all' | ClaimStatus | 'failed';

interface InvitesFiltersProps {
  readonly batchSlug: string;
  readonly status: StatusFilter;
  readonly batchOptions: readonly BatchOption[];
  readonly onBatchChange: (slug: string) => void;
  readonly onStatusChange: (status: StatusFilter) => void;
}

/**
 * Two Select filters used inside the entity table panel.
 * Batch dropdown is derived from the visible rows so we never offer a
 * batch that has no invites.
 */
export function InvitesFilters({
  batchSlug,
  status,
  batchOptions,
  onBatchChange,
  onStatusChange,
}: InvitesFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={batchSlug} onValueChange={onBatchChange}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All batches</SelectItem>
          {batchOptions.map((b) => (
            <SelectItem key={b.slug} value={b.slug}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All statuses</SelectItem>
          <SelectItem value="invited">Awaiting claim</SelectItem>
          <SelectItem value="claimed">Claimed</SelectItem>
          <SelectItem value="not_invited">Not invited</SelectItem>
          <SelectItem value="disabled">Disabled</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
