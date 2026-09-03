'use client';

import { AlertTriangle } from 'lucide-react';

import { Badge } from '@shesa/ui';

import type { ClaimStatus } from './invite-widget-types';

const STYLES: Record<ClaimStatus, string> = {
  not_invited: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
  invited: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  claimed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  disabled: 'border-destructive/40 bg-destructive/10 text-destructive',
};

const LABELS: Record<ClaimStatus, string> = {
  not_invited: 'Not invited',
  invited: 'Awaiting claim',
  claimed: 'Claimed',
  disabled: 'Disabled',
};

interface InviteStatusBadgeProps {
  readonly status: ClaimStatus | null;
  readonly error: string | null;
}

/**
 * Small badge used inside the invites table. When an invite carries an
 * Auth admin API error it takes priority over the claim status so
 * failed rows stay visually loud.
 */
export function InviteStatusBadge({ status, error }: InviteStatusBadgeProps) {
  if (error) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        title={error}
      >
        <AlertTriangle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={STYLES[status]}>
      {LABELS[status]}
    </Badge>
  );
}
